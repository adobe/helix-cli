#
# Copyright 2018 Adobe. All rights reserved.
# This file is licensed to you under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License. You may obtain a copy
# of the License at http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software distributed under
# the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
# OF ANY KIND, either express or implied. See the License for the specific language
# governing permissions and limitations under the License.
#

# Determines the current strain, and sets the X-Strain header
sub hlx_strain {
  # TODO: add X-Strain-Key as a random-generated, validation property
  # read strain from URL query string
  if (subfield(req.url.qs, "hlx_strain", "&")) {
    set req.http.X-Strain = subfield(req.url.qs, "hlx_strain", "&");
  }
  # read strain from Cookie
  if (req.http.Cookie:X-Strain) {
    set req.http.X-Strain = req.http.Cookie:X-Strain;
  }
  # we don't need cookies for anything else
  unset req.http.Cookie;
  # do not override strain if set in header
  if (!req.http.X-Strain) {
    set req.http.X-Strain = "default";

    # run custom strain resolution
    include "strains.vcl";
  }
}

# Gets the content whitelist for the current strain and sets the X-Allow header
sub hlx_allow {
  # starting permissive – change this for a more restrictive default
  set req.http.X-Allow = ".*";
  set req.http.X-Allow = table.lookup(strain_allow, req.http.X-Strain);
  if (!req.http.X-Allow) {
    set req.http.X-Allow = table.lookup(strain_allow, "default");
  }
}

# Gets the content blacklist for the current strain and sets the X-Deny header
sub hlx_deny {
  set req.http.X-Deny = "^.hlx$";
  set req.http.X-Deny = table.lookup(strain_deny, req.http.X-Strain);
  if (!req.http.X-Deny) {
    set req.http.X-Deny = table.lookup(strain_deny, "default");
  }
}

# Implements the content block list (to be called from vcl_recv)
sub hlx_block_recv {
  call hlx_deny;
  call hlx_allow;
}

# Gets the content owner for the current strain and sets the X-Owner header
sub hlx_owner {
  set req.http.X-Owner = table.lookup(strain_owners, req.http.X-Strain);
  if (!req.http.X-Owner) {
    set req.http.X-Owner = table.lookup(strain_owners, "default");
  }
}

# Gets the directory index for the current strain
sub hlx_index {
  set req.http.X-Index = table.lookup(strain_index_files, req.http.X-Strain);
  if (!req.http.X-Index) {
    set req.http.X-Index = table.lookup(strain_index_files, "default");
  }
}

# Gets the content repo
sub hlx_repo {
  set req.http.X-Repo = table.lookup(strain_repos, req.http.X-Strain);
  if (!req.http.X-Repo) {
    set req.http.X-Repo = table.lookup(strain_repos, "default");
  }
}

# Gets the content ref
sub hlx_ref {
  set req.http.X-Ref = table.lookup(strain_refs, req.http.X-Strain);
  # fall back to default strain
  if (!req.http.X-Ref) {
    set req.http.X-Ref = table.lookup(strain_refs, "default");
  }
  # if default isn't set, use 'master'
  if (!req.http.X-Ref) {
    set req.http.X-Root-Path = "master";
  }
}

# Gets the content path root
sub hlx_root_path {
  set req.http.X-Root-Path = table.lookup(strain_root_paths, req.http.X-Strain);
  if (!req.http.X-Root-Path) {
    set req.http.X-Root-Path = table.lookup(strain_root_paths, "default");
  }
  if (!req.http.X-Root-Path) {
    set req.http.X-Root-Path = "";
  }
}

sub hlx_action_root {
  set req.http.X-Action-Root = table.lookup(strain_action_roots, req.http.X-Strain);
  if (!req.http.X-Action-Root) {
    set req.http.X-Action-Root = table.lookup(strain_action_roots, "default");
  }
  #set req.http.X-Action-Root = "/trieloff/default/git-github-com-adobe-helix-cli-git--dirty--";
}

# Gets the github static repo
sub hlx_github_static_repo {
  set req.http.X-Github-Static-Repo = table.lookup(strain_github_static_repos, req.http.X-Strain);
  if (!req.http.X-Github-Static-Repo) {
    set req.http.X-Github-Static-Repo = table.lookup(strain_github_static_repos, "default");
  }
}

# Gets the github static owner
sub hlx_github_static_owner {
  set req.http.X-Github-Static-Owner = table.lookup(strain_github_static_owners, req.http.X-Strain);
  if (!req.http.X-Github-Static-Owner) {
    set req.http.X-Github-Static-Owner = table.lookup(strain_github_static_owners, "default");
  }
}

# Gets the github static root
sub hlx_github_static_root {
  set req.http.X-Github-Static-Root = table.lookup(strain_github_static_root, req.http.X-Strain);
  if (!req.http.X-Github-Static-Root) {
    set req.http.X-Github-Static-Root = table.lookup(strain_github_static_root, "default");
  }
  if (!req.http.X-Github-Static-Root) {
    set req.http.X-Github-Static-Root = "/";
  }
}

# Gets the github static ref
sub hlx_github_static_ref {
  set req.http.X-Github-Static-Ref = table.lookup(strain_github_static_refs, req.http.X-Strain);
  if (!req.http.X-Github-Static-Ref) {
    set req.http.X-Github-Static-Ref = table.lookup(strain_github_static_refs, "default");
  }
}

# rewrite required headers (called from recv)
sub hlx_headers_recv {
  # default conditions
  if (!req.http.Fastly-SSL) {
     error 801 "Force SSL";
  }
  # Header rewrite Request ID : 10
  if (!req.http.X-CDN-Request-ID) {
    set req.http.X-CDN-Request-ID = randomstr(8, "0123456789abcdef") + "-" + randomstr(4, "0123456789abcdef") + "-4" + randomstr(3, "0123456789abcdef") + "-" + randomstr(1, "89ab") + randomstr(3, "0123456789abcdef") + "-" + randomstr(12, "0123456789abcdef");
  }

  # Header rewrite Strain Cookie : 10
  if (!req.http.Set-Cookie) {
    set req.http.Set-Cookie = "X-Strain=" + req.http.X-Strain + "; Secure; HttpOnly; SameSite=Strict;";
  } else {
    set req.http.Set-Cookie = req.http.Set-Cookie "X-Strain=" + req.http.X-Strain + "; Secure; HttpOnly; SameSite=Strict;";
  }
}

# rewrite required headers (called from fetch)
sub hlx_headers_fetch {
  if ( req.http.X-Debug ) {
    # Header rewrite Backend Name : 10
    if (!beresp.http.X-Backend-Name) {
      set beresp.http.X-Backend-Name = beresp.backend.name;
    }
    # Header rewrite Response ID : 10
    if (!beresp.http.X-CDN-Request-ID) {
      set beresp.http.X-CDN-Request-ID = req.http.X-CDN-Request-ID;
    }
  }
}

sub hlx_headers_deliver {
  # Header rewrite HSTS : 10
  set resp.http.Strict-Transport-Security = "max-age=31536000; includeSubDomains";
  # Header rewrite Host : 10
  set resp.http.X-Host = req.http.Fastly-Orig-Host;
  # Response Condition: Debug (Response) Prio: 10
  if( req.http.X-Debug ) {
    # Header rewrite Backend URL : 10
    set resp.http.X-Backend-URL = req.url;
    # Header rewrite Branch : 10
    set resp.http.X-Branch = req.http.X-Branch;
    # Header rewrite Strain : 10
    set resp.http.X-Strain = req.http.X-Strain;
    # Header rewrite Strain : 10
    set resp.http.X-Github-Static-Ref = "@" + req.http.X-Github-Static-Ref;

    set resp.http.X-Dirname = req.http.X-Dirname;
    set resp.http.X-Index = req.http.X-Index;
    set resp.http.X-Action-Root = req.http.X-Action-Root;
    set resp.http.X-URL = req.http.X-URL;
 }

  call hlx_deliver_errors;
}

# set backend (called from recv)
sub hlx_backend_recv {
  set req.backend = F_AdobeRuntime;

  # Request Condition: Binaries only Prio: 10
  if( req.url ~ ".(jpg|png|gif)($|\?)" ) {
    set req.backend = F_GitHub;
  }

  # Request Condition: HTML Only Prio: 10
  if( req.url ~ ".(html)($|\?)" ) {
    set req.backend = F_AdobeRuntime;
  }
  #end condition
}

sub vcl_recv {
#FASTLY recv

  call hlx_headers_recv;
  call hlx_backend_recv;

  # Set original URL, so that we can log it afterwards.
  # If request is on Fastly-FF, we shouldn't override it.
  if (!req.http.Fastly-FF) {
    set req.http.X-Orig-URL = req.url;

    if (!req.http.X-URL) {
      set req.http.X-URL = req.url;
    }
  }

  if (req.request != "HEAD" && req.request != "GET" && req.request != "FASTLYPURGE") {
    return(pass);
  }

  # shorten URL
  declare local var.owner STRING; # the GitHub user or org, e.g. adobe
  declare local var.repo STRING; # the GitHub repo, e.g. project-helix
  declare local var.ref STRING; # the GitHub branch or revision, e.g. master
  declare local var.dir STRING; # the directory of the content
  declare local var.name STRING; # the name (without extension) of the resource
  declare local var.selector STRING; # the selector (between name and extension)
  declare local var.extension STRING;
  declare local var.branch STRING; # the branch of helix code to execute
  declare local var.strain STRING; # the resolved strain
  declare local var.action STRING; # the action to call
  declare local var.path STRING; # resource path
  declare local var.entry STRING; # bundler entry point

  if (req.http.Fastly-FF) {
    # disable ESI processing on Origin Shield
    set req.esi = false;
  } elseif ( req.url.ext == "html" ) {
       set req.http.x-esi = "1";
  }

  set var.branch = "www";

  if (req.http.Host ~ "^([^\.]+)\..+$") {
    set var.branch = re.group.1;
  }

  if (var.branch == "www") {
    set var.branch = "master";
  }

  set req.http.X-Orig-Host = req.http.Fastly-Orig-Host;
  # set req.http.X-URL = req.url;
  set req.http.X-Host = req.http.Host;

  set req.http.X-Branch = var.branch;


  call hlx_strain;
  set var.strain = req.http.X-Strain;

  # block bad requests – needs current strain and unchanged req.url
  call hlx_block_recv;

  # Parse the Request URL, if this is a proper SSL-request
  # (non-SSL gets redirected) to SSL-equivalent


  if (req.http.Fastly-SSL && (req.http.X-Static == "Static")) {
    # This is a static request.

    # Load important information from edge dicts
    call hlx_github_static_owner;
    set var.owner = req.http.X-Github-Static-Owner;

    call hlx_github_static_repo;
    set var.repo = req.http.X-Github-Static-Repo;

    call hlx_github_static_ref;
    set var.ref = req.http.X-Github-Static-Ref;

    call hlx_github_static_root;

    # TODO: check for URL ending with `/` and look up index file
    set var.path = req.http.X-URL;
    set var.entry = req.http.X-URL;

    # TODO: load magic flag
    set req.http.X-Plain = "true";

    # get it from OpenWhisk
    set req.backend = F_AdobeRuntime;

    set req.http.X-Action-Root = "/api/v1/web/" + table.lookup(secrets, "OPENWHISK_NAMESPACE") + "/default/hlx--static";
    set req.url = req.http.X-Action-Root + "?owner=" + var.owner + "&repo=" + var.repo + "&strain=" + var.strain + "&ref=" + var.ref + "&entry=" + var.entry + "&path=" + var.path + "&plain=true"  + "&allow=" urlencode(req.http.X-Allow) + "&deny=" urlencode(req.http.X-Deny) + "&root=" + req.http.X-Github-Static-Root;

  } elseif (req.http.Fastly-SSL && (req.http.X-Static == "Redirect")) {
    # Handle a redirect from static.js by
    # - fetching the resource from GitHub
    # - don't forget to override the Content-Type header
    set req.backend = F_GitHub;

  } elsif (!req.http.Fastly-FF && req.http.Fastly-SSL && (req.url.basename ~ "(^[^\.]+)(\.?(.+))?(\.[^\.]*$)" || req.url.basename == "")) {
    # This is a dynamic request.

    # Load important information from edge dicts
    call hlx_owner;
    set var.owner = req.http.X-Owner;

    call hlx_repo;
    set var.repo = req.http.X-Repo;

    call hlx_ref;
    set var.ref = req.http.X-Ref;

    call hlx_root_path;
    if (req.http.X-Dirname) {
      # set root path based on strain-specific dirname (strips away strain root)
      set var.dir = req.http.X-Root-Path + req.http.X-Dirname;
    } else {
      set var.dir = req.http.X-Root-Path + req.url.dirname;
    }

    # repeat the regex in case another re-function has been called in the meantime
    if (req.url.basename ~ "(^[^\.]+)(\.?(.+))?(\.[^\.]*$)") {
      set var.name = re.group.1;
      set var.selector = re.group.3;
      set var.extension = regsub(req.url.ext, "^\.", "");
    } else {
      call hlx_index;
      if (req.http.X-Index ~ "(^[^\.]+)\.?(.*)\.([^\.]+$)") {
        # determine directory index from strain config
        set var.name = re.group.1;
        set var.selector = re.group.2;
        set var.extension = re.group.3;
      } else {
        # force default directory index
        set req.http.X-Index = "default";
        set var.name = "index";
        set var.selector = "";
        set var.extension = "html";
      }
    }

    call hlx_action_root;



    if (var.selector ~ ".+") {
      set var.action = req.http.X-Action-Root + var.selector + "_" + var.extension;
    } else {
      set var.action = req.http.X-Action-Root + var.extension;
    }

    # check for images, and get them from GitHub
    if (req.url.ext ~ "(?i)(png|jpg|jpeg)") {
      if (req.backend == F_GitHub && req.restarts == 0) {
        if (server.identity !~ "-IAD$" && req.http.Fastly-FF !~ "-IAD") {
          set req.backend = ssl_shield_iad_va_us;
        }
        if (!req.backend.healthy) {
          # the shield datacenter is broken so dont go to it
          set req.backend = F_GitHub;
        }
      }

      set var.path = var.dir + "/" + req.url.basename;
      set req.url = "/" + var.owner + "/" + var.repo + "/" + var.ref + var.path + "?" + req.url.qs;
    } else {
      set var.path = var.dir + "/" + var.name + ".md";
      # Invoke OpenWhisk
      set req.url = "/api/v1/web" + var.action + "?owner=" + var.owner + "&repo=" + var.repo + "&ref=" + var.ref + "&path=" + var.path + "&selector=" + var.selector + "&extension=" + req.url.ext + "&branch=" + var.branch + "&strain=" + var.strain + "&GITHUB_KEY=" + table.lookup(secrets, "GITHUB_TOKEN");
    }
  }

  set req.url = regsuball(req.url, "/+", "/");

  # enable IO for image file-types
  # but not for static images or redirected images
  if (req.url.ext ~ "(?i)(?:gif|png|jpe?g|webp)" && (req.http.X-Static != "Static") && (req.http.X-Static == "Redirect"))  {
    set req.http.X-Fastly-Imageopto-Api = "fastly";
  }

  return(lookup);
}

sub hlx_fetch_errors {
  # Interpreting OpenWhisk errors is a bit tricky, because we don't have access to the JSON
  # of the response body. Instead we are using the Content-Length of known error messages
  # to determine the most likely root cause. Each root cause will get an internal status code
  # starting with 951, which is then handled by `hlx_error_errors` and `hlx_deliver_errors`
  if ( beresp.status == 404 && beresp.http.Content-Type=="application/json" && beresp.http.Content-Length=="74" ) {
      # ResponseObject: Unknown Extension
      error 951 "Unknown Extension";
  }

  if ( beresp.status == 404 && beresp.http.Content-Type=="application/json" && beresp.http.Content-Length=="69" ) {
      # ResponseObject: Unknown Extension
      error 952 "Wrong Code Path";
  }

  if ( beresp.status == 401 && beresp.http.Content-Type=="application/json" && beresp.http.Content-Length=="65" ) {
      # ResponseObject: Unknown Extension
      error 953 "Can't Call Action";
  }
}

sub hlx_deliver_errors {

  # Cache Condition: OpenWhisk Error Prio: 10
  if (resp.status == 951 ) {
     set resp.status = 404;
     set resp.response = "Not Found";
  }
  if (resp.status == 952 ) {
     set resp.status = 500;
     set resp.response = "Internal Server Error";
  }
  if (resp.status == 953 ) {
     set resp.status = 500;
     set resp.response = "Internal Server Error";
  }
}

sub hlx_error_errors {
  # Cache Condition: OpenWhisk Error Prio: 10
  if (obj.status == 951 ) {
    set obj.http.Content-Type = "text/html";
    synthetic {"include:951.html"};
    return(deliver);
  }
  if (obj.status == 952 ) {
    set obj.http.Content-Type = "text/html";
    synthetic {"include:952.html"};
    return(deliver);
  }
  if (obj.status == 953 ) {
    set obj.http.Content-Type = "text/html";
    synthetic {"include:953.html"};
    return(deliver);
  }
}

sub vcl_fetch {
#FASTLY fetch

  call hlx_fetch_errors;
  call hlx_headers_fetch;

  unset beresp.http.Set-Cookie;
  unset beresp.http.Vary;
  unset beresp.http.Expires;

  set beresp.http.Vary = "X-Debug, X-Strain";

  if (beresp.http.Expires || beresp.http.Surrogate-Control ~ "max-age" || beresp.http.Cache-Control ~ "(s-maxage|max-age)") {
    # override ttl
    } else {
    # apply a default ttl
    if (beresp.status == 200) {
      set beresp.ttl = 604800s;
      set beresp.http.Cache-Control = "max-age=604800, public";

      # apply a longer ttl for images
      if (req.url.ext ~ "(?i)(?:gif|png|jpe?g|webp)") {
        set beresp.ttl = 2592000s;
      }

    } else {
      set beresp.ttl = 60s;
    }
  }

  if ( req.http.x-esi ) {
    esi;
  }

  if (beresp.http.X-Static == "Raw/Static") {
    if (beresp.status == 307) {
      // static.js returns a 307 if the response is greater than OpenWhisk's
      // delivery limit. We restart the request and deliver directly from
      // GitHub instead, carring over the Content-Type header that static.js guessed
      set req.http.X-Static = "Redirect";
      set req.url = beresp.http.Location;
      set req.http.X-Content-Type = beresp.http.X-Content-Type;
      restart;
    } else {
      return(deliver);
    }
  } elseif (req.http.X-Static == "Redirect") {
    // and this is where we fix the headers of the GitHub static response
    // so that they become digestible by a browser.
    // - recover Content-Type from X-Content-Type
    // - filter out GitHub-headers

    set beresp.http.Content-Type = req.http.X-Content-Type;
    unset beresp.http.X-Content-Type-Options;
    unset beresp.http.X-Frame-Options;
    unset beresp.http.X-XSS-Protection;
    unset beresp.http.Content-Security-Policy;

  } elseif (beresp.status == 404 || beresp.status == 204) {
    # That was a miss. Let's try to restart.
    set beresp.http.X-Status = beresp.status + "-Restart " + req.restarts;
    set beresp.status = 404;

    if (req.http.X-Static == "Static") {
      set req.http.X-Static = "Dynamic";
      set beresp.http.X-Static = "Dynamic";
    } else {
      set req.http.X-Static = "Static";
      set beresp.http.X-Static = "Static";
    }
    set req.url = req.http.X-URL;
    restart;
  }


  return(deliver);
}

sub vcl_hit {
#FASTLY hit

  if (!obj.cacheable) {
    return(pass);
  }
  return(deliver);
}

sub vcl_miss {
#FASTLY miss
  # set backend host
  if (req.backend == F_AdobeRuntime) {
    set bereq.http.host = "adobeioruntime.net";
  } elsif (req.backend == F_GitHub) {
    set bereq.http.host = "raw.githubusercontent.com";
  }

  # set backend authentication
  if (req.backend == F_AdobeRuntime) {
    set bereq.http.Authorization = table.lookup(secrets, "OPENWHISK_AUTH");
  }

  # making sure to get an uncompressed object for ESI
  if ( req.url.ext == "html" ) {
   unset bereq.http.Accept-Encoding;
  }

  return(fetch);
}

sub vcl_deliver {
#FASTLY deliver
  call hlx_headers_deliver;

  set resp.http.Set-Cookie = "X-Strain=" + req.http.X-Strain + "; Secure; HttpOnly; SameSite=Strict;";

  if (!req.http.X-Debug) {
    # Unless we are debugging, shut up chatty headers
    unset resp.http.Access-Control-Allow-Headers;
    unset resp.http.Access-Control-Allow-Methods;
    unset resp.http.Access-Control-Allow-Origin;
    unset resp.http.Perf-Br-Resp-Out;
    unset resp.http.Server;
    unset resp.http.X-Request-Id;
    unset resp.http.X-Backend-Name;
    unset resp.http.X-CDN-Request-ID;
    unset resp.http.Via;
    unset resp.http.X-Served-By;
    unset resp.http.X-Cache;
    unset resp.http.X-Cache-Hits;
    unset resp.http.X-Timer;
    unset resp.http.X-Backend-URL;
    unset resp.http.X-Branch;
    unset resp.http.X-Strain;
    unset resp.http.X-GW-Cache;
    unset resp.http.X-Static;
    unset resp.http.X-URL;
    unset resp.http.X-Content-Type;
    unset resp.http.X-GitHub-Request-Id;
    unset resp.http.X-Fastly-Request-ID;
    unset resp.http.X-Geo-Block-List;
  }
  return(deliver);
}

sub vcl_error {
#FASTLY error
  call hlx_error_errors;
}

sub vcl_pass {
#FASTLY pass
  # set backend host
  if (req.backend == F_AdobeRuntime) {
    set bereq.http.host = "adobeioruntime.net";
  } elsif (req.backend == F_GitHub) {
    set bereq.http.host = "raw.githubusercontent.com";
  }

  # making sure to get an uncompressed object for ESI
  if ( req.url.ext == "html" ) {
   unset bereq.http.Accept-Encoding;
  }

}

sub vcl_log {
#FASTLY log
}
