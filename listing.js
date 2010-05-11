/*
  sda_stream
  Copyright (c) Ian Bennett <webdev at ianbennett dot net> 2010.
  
  sda_stream is licensed under a Creative Commons Attribution-Share Alike 2.0
    UK: England & Wales License.
  <http://creativecommons.org/licenses/by-sa/2.0/uk/>
  
  The latest version of this software is available at:
  <http://github.com/bmn/sda_stream/>
*/
function SDAStream(d) {

  // Defaults
  this.setDefaults = function() {
    // Skin
    var def;
    def = {
      online_entry: function(d) { return '<div class="entry '+d['channel']+'"><h3><a href="'+d['url']+'">'+d['username']+'</a></h3>'+d['embed']+'<div class="synopsis">'+d['synopsis']+'</div></div>'; },
      offline_entry: function(d) { return '<span class="entry '+d['channel']+'"><a href="'+d['url']+'" title="'+d['synopsis']+'">'+d['username']+'</a></span>'; },
    }
    for (var i in this.skin) { def[i] = this.skin[i]; }
    this.skin = def;
    // Selectors
    def = {
      wrapper: '#wrapper',
      online: '#online',
      offline: '#offline',
      hide: '.hide'
    }
    for (var i in this.selectors) { def[i] = this.selectors[i]; }
    this.selectors = def;
  };

  // Get the size of a hash
  Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) { if (obj.hasOwnProperty(key)) size++; }
    return size;
  };

  // Nice centered goodness
  this.setCenteringValues = function() {
    this.width = {
      entry: 350,
      window: (self.innerHeight) ? self.innerWidth : (document.documentElement && document.documentElement.clientHeight) ? document.documentElement.clientWidth : (document.body) ? document.body.clientWidth : false
    }
    this.width.max_entries = Math.floor(this.width.window / this.width.entry);
    return this.width;
  };
    
  // Get the API data and make the content
  this.get = function() {
    var req = '';
    var reqs = [];
    var c = 0;
    this.content = { online: '', offline: '' };
    this.online = [];
    this.offline = [];
    this.count = { on: 0, off: 0 };
    this.requests = { started: 0, done: 0 };
    if (this.php) { reqs[0] = ((this.php == true) ? '' : this.php+'/') +'stream.php?callback=?'; }
    else {
      for (var i in this.channels) {
        c++;
        req += i+';';
        if (((c % 10) == 0) || (c == (Object.size(channels)))) {
          reqs.push('http://api.ustream.tv/json/channel/'+req.slice(0, -1)+'/getInfo?key='+key+'&callback=?');
          req = '';
        }
      }
    }
    var opts = {dataType: 'json', success: jQuery.proxy(this, 'parseApiResponse')};
    if (this.php) opts['jsonpCallback'] = 'sda_stream';
    for (var i in reqs) {
      this.requests.started++;
      opts['url'] = reqs[i];
      $.ajax(opts);
    }
    return true;
  };
  
  this.parseApiResponse = function(j) {
    if (j) {
      var sel = this.selectors, w = this.width, s = this.skin;
      for (var k in j) {
        var single = (j[0] == null);
        var u = (single) ? j : j[k]['result'];
        u['class'] = u['urlTitleName'].replace("'", '-');
        if (!u['synopsis']) u['synopsis'] = channels[u['urlTitleName']];
        if (u['status'] == 'offline') {
          this.count.off++;
          this.offline.push(u);
          if ($(sel.online).has('.'+u['class']).length) $(sel.online+' .'+u['class']).remove();
          if (!$(sel.offline).has('.'+u['class']).length) $(sel.offline).append(s.offline_entry( {class: u['class'], channel: u['urlTitleName'], url: u['url'], username: u['user']['userName'], synopsis: u['synopsis'] } ));
        }
        else {
          this.count.on++;
          this.online.push(u);
          if ($(sel.offline).has('.'+u['class']).length) $(sel.offline+' .'+u['class']).remove();
          if (!$(sel.online).has('.'+u['class']).length) $(sel.online).append(s.online_entry( {class: u['class'], channel: u['urlTitleName'], url: u['url'], username: u['user']['userName'], embed: u['embedTag'], synopsis: u['synopsis'] } ));
        }
        if (single) break;
      }
      this.requests.done++;
      if (this.requests.done == this.requests.started) {
        if (sel.wrapper) {
          $(sel.wrapper).width( ((w.max_entries < this.count.on) ? w.max_entries : this.count.on) * w.entry);
          $(sel.wrapper).css('margin', '0 auto');
        }
        if ((this.online.length) && (sel.online)) $(sel.online).css('display', 'block');
        else $(sel.online).css('display', 'none');
        if ((this.offline.length) && (sel.offline)) $(sel.offline).css('display', 'block');
        else $(sel.offline).css('display', 'none');
        if (this.callback) this.callback(this);
      }
    }
  };
  
  d = d || {}
  d.auto = (d.auto != false);
  this.php = d.php;
  this.callback = d.callback;
  var vars = ['channels', 'key', 'skin', 'selectors'];
  for (var i in vars) { this[vars[i]] = d[vars[i]] || window[vars[i]] }
  this.setDefaults();
  this.setCenteringValues();
  if (d.auto) this.get();
}