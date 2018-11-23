# This file handles the strain resolution
if (req.http.Host == "www.example.com") {
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "default";
} else if (req.http.Host == "www.new-site.com" && (req.url.dirname ~ "^/old-stuff$" || req.url.dirname ~ "^/old-stuff/")) {
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "proxy";
  set req.http.X-Dirname = regsub(req.url.dirname, "^/old-stuff", "");
} else {
  set req.http.X-Strain = "default";
}