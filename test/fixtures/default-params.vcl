# This file handles the URL parameter whitelist

# default parameters, can be overridden per strain
set req.http.X-Old-Url = req.url;
set req.url = querystring.regfilter_except(req.url, "^foo|bar$");
set req.http.X-Encoded-Params = urlencode(req.url.qs);
set req.url = req.http.X-Old-Url;