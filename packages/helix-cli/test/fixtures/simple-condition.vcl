# This file handles the strain resolution
if ("http" == "http") {
  set req.http.X-Strain = "default";
} else if (req.http.X-Debug == "true") {
  set req.http.X-Strain = "debug";
} else {
  set req.http.X-Strain = "default";
}