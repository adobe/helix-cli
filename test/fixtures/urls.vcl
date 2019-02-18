# This file handles the strain resolution
set req.http.X-Root-Path = "";
if (req.http.Host == "www.primordialsoup.life") {
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "default";
} else if (req.http.Host == "debug.primordialsoup.life") {
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "debug";
} else if (req.http.Host == "debug.primordialsoup.life" && (req.http.X-FullDirname ~ "^/foo/bar$" || req.http.X-FullDirname ~ "^/foo/bar/")) {
  set req.http.X-Dirname = regsub(req.http.X-FullDirname, "^/foo/bar", "");
  set req.http.X-Root-Path = "/foo/bar";
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "path";
} else {
  set req.http.X-Strain = "default";
}
