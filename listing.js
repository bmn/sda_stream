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
      online_entry: function(d) { return '<div class="entry '+d.classname+'"><h3><a href="'+d.url+'">'+d.username+'</a></h3>'+d.embed+'<div class="synopsis">'+d.synopsis+'</div></div>'; },
      offline_entry: function(d) { return '<span class="entry '+d.classname+'"><a href="'+d.url+'" title="'+d.synopsis+'">'+d.username+'</a></span>'; }
    };
    for (var i in this.skin) {
      if (this.skin.hasOwnProperty(i)) { def[i] = this.skin[i]; }
    }
    this.skin = def;
    // Selectors
    def = {
      wrapper: '#wrapper',
      online: '#online',
      offline: '#offline'
    };
    for (i in this.selectors) {
      if (this.selectors.hasOwnProperty(i)) { def[i] = this.selectors[i]; }
    }
    this.selectors = def;
  };

  // Get the size of a hash
  Object.size = function(obj) {
    var size = 0, key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) { size++; }
    }
    return size;
  };

  // Nice centered goodness
  this.setCenteringValues = function() {
    this.width = {
      entry: this.entry_width,
      window: (self.innerHeight) ? self.innerWidth : (document.documentElement && document.documentElement.clientHeight) ? document.documentElement.clientWidth : (document.body) ? document.body.clientWidth : false
    };
    this.width.max_entries = Math.floor(this.width.window / this.width.entry);
    return this.width;
  };
    
  // Get the API data and make the content
  this.get = function() {
    var req = '';
    var reqs = [];
    var i = 0;
    var c = 0;
    this.content = { online: '', offline: '' };
    this.online = [];
    this.offline = [];
    this.count = { on: 0, off: 0 };
    this.requests = { started: 0, done: 0 };
    var opts = {dataType: 'jsonp', success: jQuery.proxy(this, 'parseApiResponse')};
    if (this.php || this.supercache) { opts.jsonpCallback = 'sda_stream'; }
    if (this.callback.error) { opts.error = this.callback.error; }
    if (this.php) { reqs[0] = ((this.php === true) ? '' : this.php+'/') +'stream.php'; }
    else if (this.supercache) { reqs[0] = ((this.supercache === true) ? 'cache' : this.supercache) +'/'+opts.jsonpCallback+'.api.json'; }
    else {
      for (i in this.channels) {
        if (this.channels.hasOwnProperty(i)) {
          c++;
          req += i+';';
          if (((c % 10) === 0) || (c == (Object.size(channels)))) {
            reqs.push('http://api.ustream.tv/json/channel/'+req.slice(0, -1)+'/getInfo?key='+key+'&callback=?');
            req = '';
          }
        }
      }
    }
    for (i = 0; i < reqs.length; i++) {
      this.requests.started++;
      opts.url = reqs[i];
      $.ajax(opts);
    }
    if (this.callback.loading) { this.callback.loading(this); }
    return true;
  };
  
  this.parseApiResponse = function(j) {
    if (j) {
      var sel = this.selectors, w = this.width, s = this.skin;
      var content = '';
      for (var k = 0; k < j.length; k++) {
        var single = (j[0] === null);
        var u = (single) ? j : j[k].result;
        u['class'] = u.urlTitleName.replace("'", '-');
        if (!u.synopsis) { u.synopsis = channels[u.urlTitleName]; }
        if (u.status == 'offline') {
          this.count.off++;
          this.offline.push(u);
          if ($(sel.online).has('.'+u['class']).length) { $(sel.online+' .'+u['class']).remove(); }
          if (!$(sel.offline).has('.'+u['class']).length) {
            content = s.offline_entry( {classname: u['class'], channel: u.urlTitleName, url: u.url, username: u.user.userName, synopsis: u.synopsis } );
            if (this.add == 'prepend') { $(sel.offline).prepend(content); }
            else { $(sel.offline).append(content); }
          }
        }
        else {
          this.count.on++;
          this.online.push(u);
          if ($(sel.offline).has('.'+u['class']).length) { $(sel.offline+' .'+u['class']).remove(); }
          if (!$(sel.online).has('.'+u['class']).length) {
            content = s.online_entry( {classname: u['class'], channel: u.urlTitleName, url: u.url, username: u.user.userName, embed: u.embedTag, synopsis: u.synopsis } );
            if (this.add == 'prepend') { $(sel.online).prepend(content); }
            else { $(sel.online).append(content); }
          }
        }
        if (single) { break; }
      }
      this.requests.done++;
      if (this.requests.done == this.requests.started) {
        if ((sel.wrapper) && (this.resize)) {
          $(sel.wrapper).width( ((w.max_entries < this.count.on) ? w.max_entries : this.count.on) * w.entry);
          $(sel.wrapper).css('margin', '0 auto');
        }
        $(sel.online).css('display', ((this.online.length) && (sel.online)) ? 'block' : 'none');
        $(sel.offline).css('display', ((this.offline.length) && (sel.offline)) ? 'block' : 'none');
        if (this.callback.success) { this.callback.success(this); }
      }
    }
  };
  
  d = d || {};
  d.auto = (d.auto != false);
  this.resize = (d.resize != false);
  this.callback = {success: d.success || d.callback, loading: d.loading, error: d.error};
  var vars = ['channels', 'key', 'skin', 'selectors', 'php', 'sort', 'add', 'supercache'];
  for (var i in vars) {
    if (vars.hasOwnProperty(i)) { this[vars[i]] = d[vars[i]] || window[vars[i]]; }
  }
  this.setDefaults();
  this.entry_width = d.width || 340;
  this.setCenteringValues();
  if (d.auto) { this.get(); }
}