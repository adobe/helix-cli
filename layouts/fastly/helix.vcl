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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_strain";
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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_allow";

  # starting permissive – change this for a more restrictive default
  set req.http.X-Allow = ".*";
  set req.http.X-Allow = table.lookup(strain_allow, req.http.X-Strain);
  if (!req.http.X-Allow) {
    set req.http.X-Allow = table.lookup(strain_allow, "default");
  }
}

# Gets the content blacklist for the current strain and sets the X-Deny header
sub hlx_deny {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_deny";

  set req.http.X-Deny = "^.hlx$";
  set req.http.X-Deny = table.lookup(strain_deny, req.http.X-Strain);
  if (!req.http.X-Deny) {
    set req.http.X-Deny = table.lookup(strain_deny, "default");
  }
}

# Implements the content block list (to be called from vcl_recv)
sub hlx_block_recv {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_block_recv";

  call hlx_deny;
  call hlx_allow;
}

# Gets the content owner for the current strain and sets the X-Owner header
sub hlx_owner {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_owner";

  set req.http.X-Owner = table.lookup(strain_owners, req.http.X-Strain);
  if (!req.http.X-Owner) {
    set req.http.X-Owner = table.lookup(strain_owners, "default");
  }
}

# Gets the directory index for the current strain
sub hlx_index {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_index";

  set req.http.X-Index = table.lookup(strain_index_files, req.http.X-Strain);
  if (!req.http.X-Index) {
    set req.http.X-Index = table.lookup(strain_index_files, "default");
  }
}

# Gets the content repo
sub hlx_repo {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_repo";
  set req.http.X-Repo = table.lookup(strain_repos, req.http.X-Strain);
  if (!req.http.X-Repo) {
    set req.http.X-Repo = table.lookup(strain_repos, "default");
  }
}

# Gets the content ref
sub hlx_ref {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_ref";
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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_root_path";
  set req.http.X-Root-Path = table.lookup(strain_root_paths, req.http.X-Strain);
  if (!req.http.X-Root-Path) {
    set req.http.X-Root-Path = table.lookup(strain_root_paths, "default");
  }
  if (!req.http.X-Root-Path) {
    set req.http.X-Root-Path = "";
  }
}

sub hlx_action_root {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_action_root";
  set req.http.X-Action-Root = table.lookup(strain_action_roots, req.http.X-Strain);
  if (!req.http.X-Action-Root) {
    set req.http.X-Action-Root = table.lookup(strain_action_roots, "default");
  }
  #set req.http.X-Action-Root = "/trieloff/default/git-github-com-adobe-helix-cli-git--dirty--";
}

# Gets the github static repo
sub hlx_github_static_repo {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_github_static_repo";
  set req.http.X-Github-Static-Repo = table.lookup(strain_github_static_repos, req.http.X-Strain);
  if (!req.http.X-Github-Static-Repo) {
    set req.http.X-Github-Static-Repo = table.lookup(strain_github_static_repos, "default");
  }
}

# Gets the github static owner
sub hlx_github_static_owner {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_github_static_owner";
  set req.http.X-Github-Static-Owner = table.lookup(strain_github_static_owners, req.http.X-Strain);
  if (!req.http.X-Github-Static-Owner) {
    set req.http.X-Github-Static-Owner = table.lookup(strain_github_static_owners, "default");
  }
}

# Gets the github static root
sub hlx_github_static_root {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_github_static_root";
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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_github_static_ref";
  set req.http.X-Github-Static-Ref = table.lookup(strain_github_static_refs, req.http.X-Strain);
  if (!req.http.X-Github-Static-Ref) {
    set req.http.X-Github-Static-Ref = table.lookup(strain_github_static_refs, "default");
  }
}

# rewrite required headers (called from recv)
sub hlx_headers_recv {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_headers_recv";
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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_headers_fetch";
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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_headers_deliver";
  # Header rewrite HSTS : 10
  set resp.http.Strict-Transport-Security = "max-age=31536000; includeSubDomains";
  # Header rewrite Host : 10
  set resp.http.X-Host = req.http.Fastly-Orig-Host;
  # Response Condition: Debug (Response) Prio: 10

  set resp.http.X-Version = req.http.X-Version;

  if( req.http.X-Debug ) {
    # Header rewrite Backend URL : 10
    set resp.http.X-Backend-URL = req.url;
    # Header rewrite Strain : 10
    set resp.http.X-Strain = req.http.X-Strain;
    # Header rewrite Strain : 10
    set resp.http.X-Github-Static-Ref = "@" + req.http.X-Github-Static-Ref;

    set resp.http.X-Dirname = req.http.X-Dirname;
    set resp.http.X-Index = req.http.X-Index;
    set resp.http.X-Action-Root = req.http.X-Action-Root;
    set resp.http.X-URL = req.http.X-URL;
    set resp.http.X-Root-Path = req.http.X-Root-Path;

    set resp.http.X-Fastly-Imageopto-Api = req.http.X-Fastly-Imageopto-Api;

    set resp.http.X-Embed = req.http.X-Embed;

    set resp.http.X-Trace = req.http.X-Trace;
 }

  call hlx_deliver_errors;
}

# set backend (called from recv)
sub hlx_backend_recv {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_backend_recv";
  set req.backend = F_AdobeRuntime;

  # Request Condition: Binaries only Prio: 10
  if( req.url.ext ~ "(?i)^(?:gif|png|jpe?g|webp)$" ) {
    set req.backend = F_GitHub;

    if (req.restarts == 0) {
      # enable shielding, needed for Image Optimization
      if (server.identity !~ "-IAD$" && req.http.Fastly-FF !~ "-IAD") {
        set req.backend = ssl_shield_iad_va_us;
      }
      if (!req.backend.healthy) {
        # the shield datacenter is broken so dont go to it
        set req.backend = F_GitHub;
      }
    }
  }

  # Request Condition: HTML Only Prio: 10
  if( req.url ~ ".(html)($|\?)" ) {
    set req.backend = F_AdobeRuntime;
  }
  #end condition
}

/**
 * This subroutine implements static file handling by calling
 * the hlx--static action in OpenWhisk
 * @header X-GitHub-Static-Owner  the owner or organization of the repo that contains the source files
 * @header X-GitHub-Static-Repo   the repository name of the repo containing the static files
 * @header X-GitHub-Static-Ref    the branch or tag (or commit) name to serve source files from
 * @header X-URL                  the original (unmodified) URL, starting after hostname and port
 */
sub hlx_recv_static {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_recv_static";
  # This is a static request.

  # declare local variables
  declare local var.owner STRING; # the GitHub user or org, e.g. adobe
  declare local var.repo STRING; # the GitHub repo, e.g. project-helix
  declare local var.ref STRING; # the GitHub branch or revision, e.g. master
  declare local var.dir STRING; # the directory of the content
  declare local var.name STRING; # the name (without extension) of the resource
  declare local var.selector STRING; # the selector (between name and extension)
  declare local var.extension STRING;
  declare local var.strain STRING; # the resolved strain
  declare local var.action STRING; # the action to call
  declare local var.path STRING; # resource path
  declare local var.entry STRING; # bundler entry point

  set var.strain = req.http.X-Strain;

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

}

/**
 * Handle redirect-serving for static files
 * If the static file is too large for the hlx--static action to serve,
 * because the payload would exceed 1 MB (OpenWhisk limit), the request
 * is restarted, using the `X-Static: Redirect` header, which means the
 * static content will be fetched directly from GitHub, and the required
 * response headers like Content-Type will be injected later on.
 */
sub hlx_recv_redirect {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_recv_redirect";
  # Handle a redirect from static.js by
  # - fetching the resource from GitHub
  # - don't forget to override the Content-Type header
  set req.backend = F_GitHub;

  //(!req.http.Fastly-FF && req.http.Fastly-SSL && (req.url.basename ~ "(^[^\.]+)(\.?(.+))?(\.[^\.]*$)" || req.url.basename == ""))
}

/**
 * Handle requests to Adobe I/O Runtime services.
 * When Fastly handles ESI requests to 3rd-party domains, they still get routed
 * through this service. In this method we make sure that ESI requests destined
 * for Adobe I/O Runtime, e.g. the helix-embed service are passed through to
 * the correct backend.
 */
sub hlx_recv_embed {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_recv_embed";
  # This is an embed request
  # Fastly sends embed requests back to the same service config (which is why
  # we are handling it here), but keeps the correct Host header in place (which
  # is why we can check against it)

  set req.backend = F_AdobeRuntime;

  # make sure we hit the right backend
  # and keep everything else in place

  set req.http.X-Embed = req.http.X-URL;
}

/**
 * Handles requests for the main Helix rendering pipeline.
 */
sub hlx_recv_pipeline {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_recv_pipeline";
  # This is a dynamic request.

  # declare local variables
  declare local var.owner STRING; # the GitHub user or org, e.g. adobe
  declare local var.repo STRING; # the GitHub repo, e.g. project-helix
  declare local var.ref STRING; # the GitHub branch or revision, e.g. master
  declare local var.dir STRING; # the directory of the content
  declare local var.name STRING; # the name (without extension) of the resource
  declare local var.selector STRING; # the selector (between name and extension)
  declare local var.extension STRING;
  declare local var.strain STRING; # the resolved strain
  declare local var.action STRING; # the action to call
  declare local var.path STRING; # resource path
  declare local var.entry STRING; # bundler entry point

  set var.strain = req.http.X-Strain;

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
  set var.dir = regsuball(var.dir, "/+", "/");

  # repeat the regex in case another re-function has been called in the meantime
  if (req.url.basename ~ "(^[^\.]+)(\.?(.+))?(\.[^\.]*$)") {
    set var.name = re.group.1;
    set var.selector = re.group.3;
    set var.extension = regsub(req.url.ext, "^\.", "");
  } else {
    call hlx_index;
    # enable ESI
    set req.http.x-esi = "1";
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
  if (req.url.ext ~ "(?i)^(?:gif|png|jpe?g|webp)$") {
    set var.path = var.dir + "/" + req.url.basename;
    set var.path = regsuball(var.path, "/+", "/");
    set req.url = "/" + var.owner + "/" + var.repo + "/" + var.ref + var.path + "?" + req.url.qs;

    # enable IO for image file-types
    set req.http.X-Fastly-Imageopto-Api = "fastly";
  } else {
    # get (strain-specific) parameter whitelist
    include "params.vcl";


    set var.path = var.dir + "/" + var.name + ".md";
    set var.path = regsuball(var.path, "/+", "/");
    # Invoke OpenWhisk
    set req.url = "/api/v1/web" + var.action + 
      "?owner=" + var.owner + 
      "&repo=" + var.repo + 
      "&ref=" + var.ref + 
      "&path=" + var.path + 
      "&selector=" + var.selector + 
      "&extension=" + req.url.ext + 
      "&strain=" + var.strain + 
      "&params=" + req.http.X-Encoded-Params;
  }
}

/**
 * Handle requests to Proxy Strains.
 * These requests already have a backend set as part of the strain resolution
 * so there is no need for URL rewriting.
 */
sub hlx_recv_proxy {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_recv_proxy";

}

/**
 * This is where all requests are received.
 */
sub vcl_recv {
#FASTLY recv
  if (req.http.X-Trace) {
    set req.http.X-Trace = req.http.X-Trace + "; vcl_recv";
  } else {
    set req.http.X-Trace = "vcl_recv";
  }

  call hlx_headers_recv;
  call hlx_backend_recv;

  # Set original URL, so that we can log it afterwards.
  # If request is on Fastly-FF, we shouldn't override it.
  set req.http.X-Orig-URL = req.url;

  if (!req.http.X-URL) {
    set req.http.X-URL = req.url;
  }
  
  # We only handle GET and HEAD requests
  if (req.request != "HEAD" && req.request != "GET" && req.request != "FASTLYPURGE") {
    return(pass);
  }

  if (req.http.Fastly-FF) {
    # disable ESI processing on Origin Shield
    set req.esi = false;
  } elseif ( req.url.ext == "html" ) {
    set req.http.x-esi = "1";
  }

  set req.http.X-Orig-Host = req.http.Fastly-Orig-Host;
  # set req.http.X-URL = req.url;
  set req.http.X-Host = req.http.Host;


  # Determine the current strain and execute strain-specific code
  call hlx_strain;

  # block bad requests – needs current strain and unchanged req.url
  call hlx_block_recv;


  if (req.http.Fastly-SSL) {
    # we enforce SSL for Helix
    if (req.http.X-Static == "Proxy") {
      call hlx_recv_proxy;
    } elseif (req.http.X-Static == "Static") {
      call hlx_recv_static;
    } elseif (req.http.X-Static == "Redirect") {
      call hlx_recv_redirect;
    } elseif (req.http.host == "adobeioruntime.net") {
      call hlx_recv_embed;
    } else {
      call hlx_recv_pipeline;
    }
  }

  # set X-Version initial value
  set req.http.X-Version = regsub(req.vcl, "([^.]+)\.(\d+)_(\d+)-(.*)", "\2");

  # run generated vcl
  include "dynamic.vcl";
  # re-enable shielding for changed backends
  # include "reset.vcl";

  return(lookup);
}

sub hlx_fetch_errors {
  set req.http.X-Trace = req.http.X-Trace + "; hlx_fetch_errors";
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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_deliver_errors";

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
  set req.http.X-Trace = req.http.X-Trace + "; hlx_error_errors";
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
  set req.http.X-Trace = req.http.X-Trace + "; vcl_fetch";

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
        set beresp.http.Cache-Control = "max-age=2592000, public";
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

      set req.http.X-Trace = req.http.X-Trace + "; RESTART";
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

  } elseif ((beresp.status == 404 || beresp.status == 204) && !req.http.X-Disable-Static) {
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

    set req.http.X-Trace = req.http.X-Trace + "; RESTART";
    restart;
  }


  return(deliver);
}

sub vcl_hit {
#FASTLY hit
  set req.http.X-Trace = req.http.X-Trace + "; vcl_hit";

  if (!obj.cacheable) {
    return(pass);
  }
  return(deliver);
}

sub vcl_miss {
#FASTLY miss
  set req.http.X-Trace = req.http.X-Trace + "; vcl_miss";
  unset bereq.http.X-Orig-Url;
  if (req.backend.is_shield) {
    set bereq.url = req.http.X-Orig-Url;
  }

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

  set req.http.X-Trace = req.http.X-Trace + "; vcl_deliver";
  call hlx_headers_deliver;

  # only set the strain cookie for sticky strains
  # and only do it for the Adobe I/O Runtime backend
  if (req.http.X-Strain&&req.http.X-Sticky=="true"&&req.backend == F_AdobeRuntime) {
    set resp.http.Set-Cookie = "X-Strain=" + req.http.X-Strain + "; Secure; HttpOnly; SameSite=Strict;";
  }

  if (!req.http.X-Debug) {
    # Unless we are debugging, shut up chatty headers
    unset resp.http.Access-Control-Allow-Headers;
    unset resp.http.Access-Control-Allow-Methods;
    unset resp.http.Access-Control-Allow-Origin;
    unset resp.http.Perf-Br-Resp-Out;
    unset resp.http.Server;
    unset resp.http.Via;
    unset resp.http.X-Backend-Name;
    unset resp.http.X-Backend-URL;
    unset resp.http.X-Cache-Hits;
    unset resp.http.X-Cache;
    unset resp.http.X-CDN-Request-ID;
    unset resp.http.X-Content-Type-Options;
    unset resp.http.X-Content-Type;
    unset resp.http.X-Fastly-Request-ID;
    unset resp.http.X-Frame-Options;
    unset resp.http.X-Geo-Block-List;
    unset resp.http.X-GitHub-Request-Id;
    unset resp.http.X-GW-Cache;
    unset resp.http.x-openwhisk-activation-id;
    unset resp.http.X-Request-Id;
    unset resp.http.X-Served-By;
    unset resp.http.X-Static;
    unset resp.http.X-Sticky;
    unset resp.http.X-Strain;
    unset resp.http.X-Timer;
    unset resp.http.X-URL;
    unset resp.http.x-xss-protection;
  }
  return(deliver);
}

sub vcl_error {
#FASTLY error
  set req.http.X-Trace = req.http.X-Trace + "; vcl_error";
  call hlx_error_errors;
}

sub vcl_pass {
#FASTLY pass
  set req.http.X-Trace = req.http.X-Trace + "; vcl_pass";
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
