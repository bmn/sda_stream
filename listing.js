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
      online: function(d) { return '<h2>Running Now...</h2>'+d.content; },
      offline: function(d) { return '<h2>Lazy Bums...</h2>'+d.content; },
      online_entry: function(d) { return '<div class="entry"><h3><a href="'+d['url']+'">'+d['username']+'</a></h3>'+d['embed']+'<div class="synopsis">'+d['synopsis']+'</div></div>'; },
      offline_entry: function(d) { return '<a href="'+d['url']+'" title="'+d['synopsis']+'">'+d['username']+'</a>'; },
      online_separator: '',
      offline_separator: ' : '
    }
    for (var i in this.skin) { def[i] = this.skin[i]; }
    this.skin = def;
    // Selectors
    def = {
      wrapper: '#wrapper',
      online: '#online',
      offline: '#offline'
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
    for (var i in reqs) {
      this.requests.started++;
      $.getJSON(reqs[i], null, jQuery.proxy(this, 'parseApiResponse'));
    }
  };
  
  this.parseApiResponse = function(j) {
    if (j) {
      var sel = this.selectors, w = this.width, s = this.skin;
      for (var k in j) {
        var single = (j[0] == null);
        var u = (single) ? j : j[k]['result'];
        if (!u['synopsis']) u['synopsis'] = channels[u['urlTitleName']];
        if (u['status'] == 'offline') {
          this.count.off++;
          this.offline.push(u);
          this.content.offline += s.offline_entry( {channel: u['urlTitleName'], url: u['url'], username: u['user']['userName'], synopsis: u['synopsis'] } ) + s.offline_separator;
        }
        else {
          this.count.on++;
          this.online.push(u);
          this.content.online += s.online_entry( {channel: u['urlTitleName'], url: u['url'], username: u['user']['userName'], embed: u['embedTag'], synopsis: u['synopsis'] } ) + s.online_separator;
        }
        if (single) break;
      }
      this.requests.done++;
      if (this.requests.done == this.requests.started) {
        if (sel.wrapper) {
          $(sel.wrapper).width( ((w.max_entries < this.count.on) ? w.max_entries : this.count.on) * w.entry);
          $(sel.wrapper).css('margin', '0 auto');
        }
        if ((this.content.online) && (sel.online)) $(sel.online).html( s.online( {content: this.content.online.slice(0, -s.online_separator.length || -1), count: this.count.on} ) );
        if ((this.content.offline) && (sel.offline)) $(sel.offline).html( s.offline( {content: this.content.offline.slice(0, -s.offline_separator.length || -1), count: this.count.off} ) );
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