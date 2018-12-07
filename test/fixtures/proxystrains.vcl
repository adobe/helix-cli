# This file handles the strain resolution
if (req.http.Host == "www.example.com") {
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "default";
} else if (req.http.Host == "www.new-site.com" && (req.url.dirname ~ "^/old-stuff$" || req.url.dirname ~ "^/old-stuff/")) {
  set req.http.X-Dirname = regsub(req.url.dirname, "^/old-stuff", "");
  
  # Enable passing through of requests
  
  set req.http.X-Proxy = "https://192.168.100.1:4503/";
  set req.http.X-Static = "Proxy";
  
  set req.backend = F_Proxy1921681001f402;
  set req.http.host = "192.168.100.1";
  
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "proxy";
} else {
  set req.http.X-Strain = "default";
}