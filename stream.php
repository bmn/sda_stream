<?php
/*
  sda_stream
  Copyright (c) Ian Bennett <webdev at ianbennett dot net> 2010.
  
  sda_stream is licensed under a Creative Commons Attribution-Share Alike 2.0
    UK: England & Wales License.
  <http://creativecommons.org/licenses/by-sa/2.0/uk/>
  
  The latest version of this software is available at:
  <http://github.com/bmn/sda_stream/>
*/

class SDAStream {

  private $key, $cache, $sort, $ignore, $callback;
  private $content = array();
  private $channels = array();
  private $fields = false;
  private $timer = 1;
  private $expires = 0;
  private $sort_text = array('user' => "['user']['userName']", 'channel' => "['user']['title']");
  
  public function SDAStream($d = array()) {
    $this->content = array();
    if ($d['channels']) $this->channels = $d['channels'];
    $this->key = $d['key'];
    $this->timer = ((($d['timer']) ? $d['timer'] : $this->timer) * 60);
    $s = DIRECTORY_SEPARATOR;
    $this->callback = (is_string($d['cache'])) ? $d['cache'] : 'sda_stream';
    $this->cache = dirname(__FILE__)."{$s}cache{$s}{$this->callback}.api.json";
    $this->sort = $d['sort'];
    if ($d['ignore']) $this->ignore = (is_string($d['ignore']) ? array($d['ignore']) : $d['ignore']);
    if ($d['fields']) $this->fields = $d['fields'];
  }
  
  public function get($format = 'php') {
    // Return the content if it's already been made in this pageload
    if ($this->content[$format]) return $this->return_data($format);
    // Check for a cached API response and return it if it's still valid
    $f = $this->cache;
    if (file_exists($f)) {
      $this->expires = (filemtime($f) + $this->timer - 1);
      if (
        ($this->expires > time())
        && is_readable($f)
      ) {
        $this->content['json'] = substr(file_get_contents($f), strlen($this->callback) + 1, -2);
        if (!$_GET['callback'])
          $this->content['php'] = json_decode($this->content['json'], true);
        return $this->return_data($format);
      } else {
        unlink($f);
      }
    }
    // Else request the data from the API
    $reqs = $strs = $errors = $responses = array();
    $ct = count($this->channels);
    if ($ct == 0) { break; }
    for ($i = 0; $i <= $ct; $i += 10) {
      $strs[] = 'http://api.ustream.tv/json/channel/' . implode(';', array_keys(array_slice($this->channels, $i, 10, true))) . '/getInfo?key='.$this->key;
    }
    if (count($strs) == 0) { return false; }
    // Make requests using curl if it's available
    if (function_exists('curl_multi_init')) {
      $req = curl_multi_init();
      foreach ($strs as $k => $v) {
        $reqs[$k] = curl_init($v);
        curl_setopt($reqs[$k], CURLOPT_HEADER, false);
        curl_setopt($reqs[$k], CURLOPT_RETURNTRANSFER, true);
        curl_multi_add_handle($req, $reqs[$k]);
      }
      $running = null;
      do { $tmp = curl_multi_exec($req, $running); }
      while ($tmp == CURLM_CALL_MULTI_PERFORM);
      while ($running && ($tmp == CURLM_OK)) {
        $numberReady = curl_multi_select($req);
        if ($numberReady != -1) {
          do { $tmp = curl_multi_exec($req, $running); }
          while ($tmp == CURLM_CALL_MULTI_PERFORM);
        }
      }
      foreach ($reqs as $k => $v) {
        $responses[] = json_decode(curl_multi_getcontent($reqs[$k]), true);
        curl_multi_remove_handle($req, $reqs[$k]);
        curl_close($reqs[$k]);
      }
      curl_multi_close($req);
    }
    // Else use a slower fsockopen-based method
    else foreach ($strs as $v) { 
      $responses[] = json_decode(self::http($v), true);
    }
    // Parse the JSON responses into a PHP array,
    // and convert back to a single JSON string
    foreach ($responses as $c) {
      if ($c['error']) {
        $errors[] = array('code' => $c['error'], 'msg' => $c['msg']);
        continue;
      }
      $c = $c['results'];
      if ((count($strs) == 1) && ($c['id'])) {
        $c = self::filter_fields($c);
        $this->content['php'] = array_merge($c, array('synopsis' => $this->channels[$c['urlTitleName']]));
      } else {
        $c = ($c['id']) ? array(array('result' => $c)) : $c;
        foreach ($c as $r) {
          $r = self::filter_fields($r);
          $r['result']['synopsis'] = $this->channels[$r['uid']];
          $this->content['php'][] = $r;
        }
      }
    }
    $this->sort();
    $this->content['json'] = json_encode($this->content['php']);
    // Save the JSON to a cache file
    if (!is_dir(dirname($f))) { mkdir(dirname($f), true); }
    file_put_contents($f, $this->callback.'('.$this->content['json'].');');
    $this->expires = (time() + $this->timer);
    // Return the data
    return $this->return_data($format);
  }
  
  private function return_data($format) {
    // Return JSONP
    if ($_GET['callback']) { return $_GET['callback'].'('.$this->content['json'].');'; }
    // Return online/offline (PHP only)
    if ($format == 'php') {
      $out = array( array(), array() );
      foreach ($this->content['php'] as $a) {
        $out[ ($a['result']['status'] == 'offline') ? 1 : 0 ][] = $a['result'];
      }
      return $out;
    }
    // Other output
    return $this->content[$format];
  }
  
  private function sort() {
    if (!$this->sort) return false;
    $f = $this->sort_text[$this->sort];
    if ($f) { $sort = create_function('$a, $b', 'return $a["result"]'.$f.' - $b["result"]'.$f.';'); }
    elseif ($this->sort == 'last') {
      $f = "['lastStreamedAt']";
      $sort = create_function('$a, $b', '$ad = strtotime($a["result"]'.$f.'); $bd = strtotime($b["result"]'.$f.'); return $bd - $ad;');
    }
    else return false;
    usort($this->content['php'], $sort);
  }
  
  private static function http($url) {
    $url_stuff = parse_url($url);
    $port = isset($url_stuff['port']) ? $url_stuff['port'] : 80;
    $fp = fsockopen($url_stuff['host'], $port);
    $query  = 'GET ' . $url_stuff['path'] . " HTTP/1.0\n";
    $query .= 'Host: ' . $url_stuff['host'];
    $query .= "\n\n";
    fwrite($fp, $query);
    while ($tmp = fread($fp, 1024)) { $buffer .= $tmp; }
    return substr($buffer, strrpos($buffer, "\n") + 1); 
  }
  
  public function headers() {
    if ($this->expires == 0) $this->get('php');
    header("Expires: ".date('r', $this->expires));
    header("Last-Modified: ".date('r', time()));
  }
  
  private function filter_fields($c) {
    if (!$this->fields) return $c;
    $n = array('uid' => $c['uid']);
    $n['result'] = self::loop_fields($c['result'], $this->fields);
    return $n;
  }
  
  private static function loop_fields($c, $f) {
    $out = array();
    foreach ($f as $k => $e) {
      if (is_array($e)) $out[$k] = self::loop_fields($c[$k], $e);
      else $out[$e] = $c[$e];
    }
    return $out;
  }

}

// Return the API in JSON format if this file is being requested, not included
if (reset(get_included_files()) == __FILE__) {
  include 'config.php';
  if (!is_array($channels) || !isset($key))
    die('Config not provided by config.php');
  $stream = new SDAStream( array(
    'channels'  => $channels,
    'key'       => $key,
    'timer'     => $timer,
    'cache'     => $cache,
    'fields'    => $fields,
  ) );
  $stream->headers();
  echo $stream->get('json');
}