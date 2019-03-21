# This file handles the strain resolution
set req.http.X-Root-Path = "";
if ("http" == "http") {
  set req.http.X-Sticky = "true";
  set req.http.X-Strain = "default";
} else if (req.http.X-Debug == "true") {
  set req.http.X-Sticky = "false";
  set req.http.X-Strain = "debug";
} else {
  set req.http.X-Strain = "default";
}
