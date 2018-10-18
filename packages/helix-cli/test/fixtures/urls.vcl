# This file handles the strain resolution
if (req.http.Host == "www.primordialsoup.life") {
  set req.http.X-Strain = "default";
} else if (req.http.Host == "debug.primordialsoup.life") {
  set req.http.X-Strain = "debug";
} else if (req.http.Host == "debug.primordialsoup.life" && (req.url.dirname ~ "^/foo/bar$" || req.url.dirname ~ "^/foo/bar/")) {
  set req.http.X-Strain = "path";
  set req.http.X-Dirname = regsub(req.url.dirname, "^/foo/bar", "");
} else {
  set req.http.X-Strain = "default";
}
