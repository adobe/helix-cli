# This file handles the URL parameter whitelist



if (req.http.X-Strain == "debug") {
  set req.http.X-Old-Url = req.url;
  set req.url = querystring.regfilter_except(req.url, "^(baz|maz|hlx_.*)$");
  set req.http.X-Encoded-Params = urlencode(req.url.qs);
  set req.url = req.http.X-Old-Url;
}
