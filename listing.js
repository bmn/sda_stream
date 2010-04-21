// Default skin
skin_default = {
  online: function(d) { return '<h2>Running Now...</h2>'+d.content; },
  offline: function(d) { return '<h2>Lazy Bums...</h2>'+d.content; },
  online_entry: function(d) { return '<div class="entry"><h3><a href="'+d['url']+'">'+d['username']+'</a></h3>'+d['embed']+'<div class="synopsis">'+d['synopsis']+'</div></div>'; },
  offline_entry: function(d) { return '<a href="'+d['url']+'" title="'+d['synopsis']+'">'+d['username']+'</a>'; },
  online_separator: '',
  offline_separator: ' : '
}
var j = skin_default;
for (var i in skin) { j[i] = skin[i]; }
skin = j;

// Get the size of a hash
Object.size = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};

// Nice centered goodness
entry_width = 350;
window_width = (self.innerHeight) ? self.innerWidth : (document.documentElement && document.documentElement.clientHeight) ? document.documentElement.clientWidth : (document.body) ? document.body.clientWidth : false;
max_entries = Math.floor(window_width / entry_width);
  
// Get the API data and make the content
req = '';
online = offline = {};
c_on = c_off = '';
ct_on = ct_off = c = 0;
for (var i in channels) {
  c++;
  req = req+i+';';
  if (((c % 10) == 0) || (c == (Object.size(channels)))) {
    req = 'http://api.ustream.tv/json/channel/'+req.slice(0, -1)+'/getInfo?key='+key+'&callback=?';
    $.getJSON(req, function(j) {
      if (j) {
        for (var k in j) {
          var single = (j[0] == null);
          var u = (single) ? j : j[k]['result'];
          u['synopsis'] = channels[u['urlTitleName']];
          if (u['status'] == 'offline') {
            ct_off++;
            c_off += skin.offline_entry( {channel: u['urlTitleName'], url: u['url'], username: u['user']['userName'], synopsis: u['synopsis'] } ) + skin.offline_separator;
          }
          else {
            ct_on++;
            c_on += skin.online_entry( {channel: u['urlTitleName'], url: u['url'], username: u['user']['userName'], embed: u['embedTag'], synopsis: u['synopsis'] } ) + skin.online_separator;
          }
          if (single) break;
        }
        $("#wrapper").width( ((max_entries < ct_on) ? max_entries : ct_on) * entry_width);
        $("#wrapper").css('margin', '0 auto');
        if (c_on) $("#online").html( skin.online( {content: c_on.slice(0, -skin.online_separator.length || -1), count: ct_on} ) );
        if (c_off) $("#offline").html( skin.offline( {content: c_off.slice(0, -skin.offline_separator.length || -1), count: ct_off} ) );
      }
    });
    req = '';
  }
}