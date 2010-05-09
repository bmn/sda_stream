<html>
  <head>
    <title>sda_stream PHP Example</title>
    <link href="style.css" type="text/css" rel="stylesheet" media="screen"/>
  </head>
  <body>
    <h1>sda_stream PHP Example</h1>
    <p>As well as a Javascript library, sda_stream is also a PHP library. You can create your page without using any Javascript if necessary.</p>
    <p>This has the benefits of hiding your API key, and allowing you to cache API requests. See <a href="example-php-request.html">example-php-request.html</a> for further details.</p>
    <ul>
      <li>Include stream.php into your app.</li>
      <li>Create a new SDAStream object, passing it the channel data, API key and other info.</li>
      <li>Call SDAStream::get(), which returns online and offline arrays of channel data.</li>
      <li>Use this data to do your own thing.</li>
    </ul>
    <p>See the result below.</p>
    <?php
      require '../stream.php';
      require '../config.php';
      if (!is_array($channels) || !isset($key))
        die('Config not provided by config.php');
      $stream = new SDAStream( array(
        'channels'  => $channels,
        'key'       => $key,
        'timer'     => $timer,
        'cache'     => $cache
      ) );
      list($online, $offline) = $stream->get();
    ?>
    <div id="wrapper">
      <div id="online">
        <?php
          if (count($online) > 0)
            print '<h2>Running Now...</h2>';
          foreach($online as $entry) {
            print <<<HTML
        <div class="entry">
          <h3><a href="{$entry['url']}">{$entry['user']['userName']}</a></h3>
          {$entry['embedTag']}
          <div class="synopsis">{$entry['synopsis']}</div>
        </div>
HTML;
          }
        ?>
      </div>
    </div>
    <div id="offline">
      <?php
        if (count($offline) > 0)
          print '<h2>Lazy Bums...</h2>';
        $content = array();
        foreach ($offline as $entry) {
          $content[] = <<<HTML
          <a href="{$entry['url']}" title="{$entry['synopsis']}">{$entry['user']['userName']}</a>
HTML;
        }
        print implode($content, ' : ');
      ?>
    </div>
  </body>
</html>