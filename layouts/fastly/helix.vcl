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

# Gets the content owner for the current strain and sets the X-Owner header
sub hlx_owner {
  set req.http.X-Owner = table.lookup(strain_owners, req.http.X-Strain);
  if (!req.http.X-Owner) {
    set req.http.X-Owner = table.lookup(strain_owners, "default");
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

# rewrite required hedaers (called from fetch)
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
  }

  call hlx_deliver_errors;
}

# set backend (called from recv)
sub hlx_backend_recv {
  # Request Condition: Binaries only Prio: 10
  if( req.url ~ ".(jpg|png|gif)($|\?)" ) {
    set req.backend = F_GitHub;
  }
  
  # Request Condition: HTML Only Prio: 10
  if( req.url ~ ".(html)($|\?)" ) {
    set req.backend = F_runtime_adobe_io;
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

  # Determine the Current Branch using the Host header
  # TODO: use Edge Side Dictinoaries to allow for more flexible configuration
  # NOTE: I'm doing this outside the following IF statement, because the re variable 
  # would be reset by running repeated regexps

  set var.branch = "www";

  if (req.http.Host ~ "^([^\.]+)\..+$") {
    set var.branch = re.group.1;
  }

  if (var.branch == "www") {
    set var.branch = "master";
  }

  set req.http.X-Orig-Host = req.http.Fastly-Orig-Host;
  set req.http.X-Host = req.http.Host;

  set req.http.X-Branch = var.branch;



  # Parse the Request URL, if this is a proper SSL-request 
  # (non-SSL gets redirected) to SSL-equivalent


  if (!req.http.Fastly-FF && req.http.Fastly-SSL && req.url.path ~ "\/dist\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/(.+)") {
    set var.owner = re.group.1;
    set var.repo = re.group.2;
    set var.ref = re.group.3;
    set var.entry = re.group.4;
    set var.path = re.group.5;

    set req.backend = F_runtime_adobe_io;

    # Invoke OpenWhisk
      set req.url = "/api/v1/web/trieloff/default/disty" + "?owner=" + var.owner + "&repo=" + var.repo + "&ref=" + var.ref + "&path=" + var.path + "&entry=" + var.entry;

  # The regular expression captures:
  # group.0 = entire string
  # group.1 = name, without selector or extension
  # group.2 = selector, including leading dot
  # group.3 = selector, without leading dot
  # group.4 = extension, with leading dot
  # group.0, group.2, and group.4 won't be processed
  } elsif (!req.http.Fastly-FF && req.http.Fastly-SSL && req.url.basename ~ "(^[^\.]+)(\.?(.+))?(\.[^\.]*$)") {
    # Parse the URL

    call hlx_strain;
    set var.strain = req.http.X-Strain;

    call hlx_owner;
    set var.owner = req.http.X-Owner;

    call hlx_repo;
    set var.repo = req.http.X-Repo;

    call hlx_ref;
    set var.ref = req.http.X-Ref;

    call hlx_root_path;
    set var.dir = req.http.X-Root-Path + req.url.dirname;

    set var.name = re.group.1;
    set var.selector = re.group.3;

    call hlx_action_root;

    set var.extension = regsub(req.url.ext, "^\.", "");
    
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
      set req.url = "/" + var.owner + "/" + var.repo + "/" + var.ref + "/" + var.dir + "/" + req.url.basename + "?" + req.url.qs;
    } else {
      # Invoke OpenWhisk
      set req.url = "/api/v1/web" + var.action + "?owner=" + var.owner + "&repo=" + var.repo + "&ref=" + var.ref + "&path=" + var.dir + "/" + var.name + ".md" + "&selector=" + var.selector + "&extension=" + req.url.ext + "&branch=" + var.branch + "&strain=" + var.strain + "&GITHUB_KEY=" + table.lookup(secrets, "GITHUB_TOKEN");
    }
  }

  # enable IO for image file-types
  if (req.url.ext ~ "(?i)(?:gif|png|jpe?g|webp)")  {
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
    synthetic {"<!doctype html>
    <html lang="en">
      <head>
        <title>Resource not Found</title>
        <!-- Required meta tags -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <style>
    @import url(https://fonts.googleapis.com/css?family=opensans:500);
    body{
                    background: #111155;
                    color:#fff;
                    font-family: 'Open Sans', sans-serif;
                    max-height:700px;
                    overflow: hidden;
                }
                .c{
                    text-align: center;
                    display: block;
                    position: relative;
                    width:80%;
                    margin:100px auto;
                }
                ._404{
                    font-size: 220px;
                    position: relative;
                    display: inline-block;
                    z-index: 2;
                    height: 250px;
                    letter-spacing: 15px;
                }
                ._1{
                    text-align:center;
                    display:block;
                    position:relative;
                    letter-spacing: 12px;
                    font-size: 4em;
                    line-height: 80%;
                    margin-top:0.2em;
                    margin-bottom:0.2em;
                }
                ._2{
                    text-align:center;
                    display:block;
                    position: relative;
                    font-size: 20px;
                }
                .text{
                    font-size: 70px;
                    text-align: center;
                    position: relative;
                    display: inline-block;
                    margin: 19px 0px 0px 0px;
                    /* top: 256.301px; */
                    z-index: 3;
                    width: 100%;
                    line-height: 1.2em;
                    display: inline-block;
                }
              

                .btn{
                    background-color: rgb( 255, 255, 255 );
                    position: relative;
                    display: inline-block;
                    width: 358px;
                    padding: 5px;
                    z-index: 5;
                    font-size: 25px;
                    margin:0 auto;
                    color:#111155;
                    text-decoration: none;
                    margin-right: 10px
                }
                .right{
                    float:right;
                    width:60%;
                }
                
                hr{
                    padding: 0;
                    border: none;
                    border-top: 5px solid #fff;
                    color: #fff;
                    text-align: center;
                    margin: 0px auto;
                    width: 420px;
                    height:10px;
                    z-index: -10;
                }
                
                hr:after {
                    content: "\2022";
                    display: inline-block;
                    position: relative;
                    top: -0.75em;
                    font-size: 2em;
                    padding: 0 0.2em;
                    background: #111155;
                }
                
                .cloud {
                    width: 350px; height: 120px;

                    background: #FFF;
                    background: linear-gradient(top, #FFF 100%);
                    background: -webkit-linear-gradient(top, #FFF 100%);
                    background: -moz-linear-gradient(top, #FFF 100%);
                    background: -ms-linear-gradient(top, #FFF 100%);
                    background: -o-linear-gradient(top, #FFF 100%);

                    border-radius: 100px;
                    -webkit-border-radius: 100px;
                    -moz-border-radius: 100px;

                    position: absolute;
                    margin: 120px auto 20px;
                    z-index:-1;
                    transition: ease 1s;
                }

                .cloud:after, .cloud:before {
                    content: '';
                    position: absolute;
                    background: #FFF;
                    z-index: -1
                }

                .cloud:after {
                    width: 100px; height: 100px;
                    top: -50px; left: 50px;

                    border-radius: 100px;
                    -webkit-border-radius: 100px;
                    -moz-border-radius: 100px;
                }

                .cloud:before {
                    width: 180px; height: 180px;
                    top: -90px; right: 50px;

                    border-radius: 200px;
                    -webkit-border-radius: 200px;
                    -moz-border-radius: 200px;
                }
                
                .x1 {
                    top:-50px;
                    left:100px;
                    -webkit-transform: scale(0.3);
                    -moz-transform: scale(0.3);
                    transform: scale(0.3);
                    opacity: 0.9;
                    -webkit-animation: moveclouds 15s linear infinite;
                    -moz-animation: moveclouds 15s linear infinite;
                    -o-animation: moveclouds 15s linear infinite;
                }
                
                .x1_5{
                    top:-80px;
                    left:250px;
                    -webkit-transform: scale(0.3);
                    -moz-transform: scale(0.3);
                    transform: scale(0.3);
                    -webkit-animation: moveclouds 17s linear infinite;
                    -moz-animation: moveclouds 17s linear infinite;
                    -o-animation: moveclouds 17s linear infinite; 
                }

                .x2 {
                    left: 250px;
                    top:30px;
                    -webkit-transform: scale(0.6);
                    -moz-transform: scale(0.6);
                    transform: scale(0.6);
                    opacity: 0.6; 
                    -webkit-animation: moveclouds 25s linear infinite;
                    -moz-animation: moveclouds 25s linear infinite;
                    -o-animation: moveclouds 25s linear infinite;
                }

                .x3 {
                    left: 250px; bottom: -70px;

                    -webkit-transform: scale(0.6);
                    -moz-transform: scale(0.6);
                    transform: scale(0.6);
                    opacity: 0.8; 

                    -webkit-animation: moveclouds 25s linear infinite;
                    -moz-animation: moveclouds 25s linear infinite;
                    -o-animation: moveclouds 25s linear infinite;
                }

                .x4 {
                    left: 470px; botttom: 20px;

                    -webkit-transform: scale(0.75);
                    -moz-transform: scale(0.75);
                    transform: scale(0.75);
                    opacity: 0.75;

                    -webkit-animation: moveclouds 18s linear infinite;
                    -moz-animation: moveclouds 18s linear infinite;
                    -o-animation: moveclouds 18s linear infinite;
                }

                .x5 {
                    left: 200px; top: 300px;

                    -webkit-transform: scale(0.5);
                    -moz-transform: scale(0.5);
                    transform: scale(0.5);
                    opacity: 0.8; 

                    -webkit-animation: moveclouds 20s linear infinite;
                    -moz-animation: moveclouds 20s linear infinite;
                    -o-animation: moveclouds 20s linear infinite;
                }

                @-webkit-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }
                @-moz-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }
                @-o-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }    
        </style>
      </head>
      <body>
        <div id="clouds">
          <div class="cloud x1"></div>
          <div class="cloud x1_5"></div>
          <div class="cloud x2"></div>
          <div class="cloud x3"></div>
          <div class="cloud x4"></div>
          <div class="cloud x5"></div>
      </div>
      <div class='c'>
          <div class='_404'>404</div>
          <hr>
          <div class='_1'>RESOURCE</div>
          <div class='_1'>NOT FOUND</div>
          <code class='btn'>The requested selector or extension could not be found.</code>
      </div>
      </body>
    </html>"};
    return(deliver);
  }
  if (obj.status == 952 ) {
    set obj.http.Content-Type = "text/html";
    synthetic {"<!doctype html>
    <html lang="en">
      <head>
        <title>Internal Server Error</title>
        <!-- Required meta tags -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <style>
    @import url(https://fonts.googleapis.com/css?family=opensans:500);
    body{
                    background: #111155;
                    color:#fff;
                    font-family: 'Open Sans', sans-serif;
                    max-height:700px;
                    overflow: hidden;
                }
                .c{
                    text-align: center;
                    display: block;
                    position: relative;
                    width:80%;
                    margin:100px auto;
                }
                ._404{
                    font-size: 220px;
                    position: relative;
                    display: inline-block;
                    z-index: 2;
                    height: 250px;
                    letter-spacing: 15px;
                }
                ._1{
                    text-align:center;
                    display:block;
                    position:relative;
                    letter-spacing: 12px;
                    font-size: 4em;
                    line-height: 80%;
                    margin-top:0.2em;
                    margin-bottom:0.2em;
                }
                ._2{
                    text-align:center;
                    display:block;
                    position: relative;
                    font-size: 20px;
                }
                .text{
                    font-size: 70px;
                    text-align: center;
                    position: relative;
                    display: inline-block;
                    margin: 19px 0px 0px 0px;
                    /* top: 256.301px; */
                    z-index: 3;
                    width: 100%;
                    line-height: 1.2em;
                    display: inline-block;
                }
              

                .btn{
                    background-color: rgb( 255, 255, 255 );
                    position: relative;
                    display: inline-block;
                    width: 358px;
                    padding: 5px;
                    z-index: 5;
                    font-size: 25px;
                    margin:0 auto;
                    color:#111155;
                    text-decoration: none;
                    margin-right: 10px
                }
                .right{
                    float:right;
                    width:60%;
                }
                
                hr{
                    padding: 0;
                    border: none;
                    border-top: 5px solid #fff;
                    color: #fff;
                    text-align: center;
                    margin: 0px auto;
                    width: 420px;
                    height:10px;
                    z-index: -10;
                }
                
                hr:after {
                    content: "\2022";
                    display: inline-block;
                    position: relative;
                    top: -0.75em;
                    font-size: 2em;
                    padding: 0 0.2em;
                    background: #111155;
                }
                
                .cloud {
                    width: 350px; height: 120px;

                    background: #FFF;
                    background: linear-gradient(top, #FFF 100%);
                    background: -webkit-linear-gradient(top, #FFF 100%);
                    background: -moz-linear-gradient(top, #FFF 100%);
                    background: -ms-linear-gradient(top, #FFF 100%);
                    background: -o-linear-gradient(top, #FFF 100%);

                    border-radius: 100px;
                    -webkit-border-radius: 100px;
                    -moz-border-radius: 100px;

                    position: absolute;
                    margin: 120px auto 20px;
                    z-index:-1;
                    transition: ease 1s;
                }

                .cloud:after, .cloud:before {
                    content: '';
                    position: absolute;
                    background: #FFF;
                    z-index: -1
                }

                .cloud:after {
                    width: 100px; height: 100px;
                    top: -50px; left: 50px;

                    border-radius: 100px;
                    -webkit-border-radius: 100px;
                    -moz-border-radius: 100px;
                }

                .cloud:before {
                    width: 180px; height: 180px;
                    top: -90px; right: 50px;

                    border-radius: 200px;
                    -webkit-border-radius: 200px;
                    -moz-border-radius: 200px;
                }
                
                .x1 {
                    top:-50px;
                    left:100px;
                    -webkit-transform: scale(0.3);
                    -moz-transform: scale(0.3);
                    transform: scale(0.3);
                    opacity: 0.9;
                    -webkit-animation: moveclouds 15s linear infinite;
                    -moz-animation: moveclouds 15s linear infinite;
                    -o-animation: moveclouds 15s linear infinite;
                }
                
                .x1_5{
                    top:-80px;
                    left:250px;
                    -webkit-transform: scale(0.3);
                    -moz-transform: scale(0.3);
                    transform: scale(0.3);
                    -webkit-animation: moveclouds 17s linear infinite;
                    -moz-animation: moveclouds 17s linear infinite;
                    -o-animation: moveclouds 17s linear infinite; 
                }

                .x2 {
                    left: 250px;
                    top:30px;
                    -webkit-transform: scale(0.6);
                    -moz-transform: scale(0.6);
                    transform: scale(0.6);
                    opacity: 0.6; 
                    -webkit-animation: moveclouds 25s linear infinite;
                    -moz-animation: moveclouds 25s linear infinite;
                    -o-animation: moveclouds 25s linear infinite;
                }

                .x3 {
                    left: 250px; bottom: -70px;

                    -webkit-transform: scale(0.6);
                    -moz-transform: scale(0.6);
                    transform: scale(0.6);
                    opacity: 0.8; 

                    -webkit-animation: moveclouds 25s linear infinite;
                    -moz-animation: moveclouds 25s linear infinite;
                    -o-animation: moveclouds 25s linear infinite;
                }

                .x4 {
                    left: 470px; botttom: 20px;

                    -webkit-transform: scale(0.75);
                    -moz-transform: scale(0.75);
                    transform: scale(0.75);
                    opacity: 0.75;

                    -webkit-animation: moveclouds 18s linear infinite;
                    -moz-animation: moveclouds 18s linear infinite;
                    -o-animation: moveclouds 18s linear infinite;
                }

                .x5 {
                    left: 200px; top: 300px;

                    -webkit-transform: scale(0.5);
                    -moz-transform: scale(0.5);
                    transform: scale(0.5);
                    opacity: 0.8; 

                    -webkit-animation: moveclouds 20s linear infinite;
                    -moz-animation: moveclouds 20s linear infinite;
                    -o-animation: moveclouds 20s linear infinite;
                }

                @-webkit-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }
                @-moz-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }
                @-o-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }    
        </style>
      </head>
      <body>
        <div id="clouds">
          <div class="cloud x1"></div>
          <div class="cloud x1_5"></div>
          <div class="cloud x2"></div>
          <div class="cloud x3"></div>
          <div class="cloud x4"></div>
          <div class="cloud x5"></div>
      </div>
      <div class='c'>
          <div class='_404'>500</div>
          <hr>
          <div class='_1'>INTERNAL</div>
          <div class='_1'>SERVER ERROR</div>
          <code class='btn'>There is no action with the configured prefix.</code>
      </div>
      </body>
    </html>"};
    return(deliver);
  }
  if (obj.status == 953 ) {
    set obj.http.Content-Type = "text/html";
    synthetic {"<!doctype html>
    <html lang="en">
      <head>
        <title>Internal Server Error</title>
        <!-- Required meta tags -->
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <style>
    @import url(https://fonts.googleapis.com/css?family=opensans:500);
    body{
                    background: #111155;
                    color:#fff;
                    font-family: 'Open Sans', sans-serif;
                    max-height:700px;
                    overflow: hidden;
                }
                .c{
                    text-align: center;
                    display: block;
                    position: relative;
                    width:80%;
                    margin:100px auto;
                }
                ._404{
                    font-size: 220px;
                    position: relative;
                    display: inline-block;
                    z-index: 2;
                    height: 250px;
                    letter-spacing: 15px;
                }
                ._1{
                    text-align:center;
                    display:block;
                    position:relative;
                    letter-spacing: 12px;
                    font-size: 4em;
                    line-height: 80%;
                    margin-top:0.2em;
                    margin-bottom:0.2em;
                }
                ._2{
                    text-align:center;
                    display:block;
                    position: relative;
                    font-size: 20px;
                }
                .text{
                    font-size: 70px;
                    text-align: center;
                    position: relative;
                    display: inline-block;
                    margin: 19px 0px 0px 0px;
                    /* top: 256.301px; */
                    z-index: 3;
                    width: 100%;
                    line-height: 1.2em;
                    display: inline-block;
                }
              

                .btn{
                    background-color: rgb( 255, 255, 255 );
                    position: relative;
                    display: inline-block;
                    width: 358px;
                    padding: 5px;
                    z-index: 5;
                    font-size: 25px;
                    margin:0 auto;
                    color:#111155;
                    text-decoration: none;
                    margin-right: 10px
                }
                .right{
                    float:right;
                    width:60%;
                }
                
                hr{
                    padding: 0;
                    border: none;
                    border-top: 5px solid #fff;
                    color: #fff;
                    text-align: center;
                    margin: 0px auto;
                    width: 420px;
                    height:10px;
                    z-index: -10;
                }
                
                hr:after {
                    content: "\2022";
                    display: inline-block;
                    position: relative;
                    top: -0.75em;
                    font-size: 2em;
                    padding: 0 0.2em;
                    background: #111155;
                }
                
                .cloud {
                    width: 350px; height: 120px;

                    background: #FFF;
                    background: linear-gradient(top, #FFF 100%);
                    background: -webkit-linear-gradient(top, #FFF 100%);
                    background: -moz-linear-gradient(top, #FFF 100%);
                    background: -ms-linear-gradient(top, #FFF 100%);
                    background: -o-linear-gradient(top, #FFF 100%);

                    border-radius: 100px;
                    -webkit-border-radius: 100px;
                    -moz-border-radius: 100px;

                    position: absolute;
                    margin: 120px auto 20px;
                    z-index:-1;
                    transition: ease 1s;
                }

                .cloud:after, .cloud:before {
                    content: '';
                    position: absolute;
                    background: #FFF;
                    z-index: -1
                }

                .cloud:after {
                    width: 100px; height: 100px;
                    top: -50px; left: 50px;

                    border-radius: 100px;
                    -webkit-border-radius: 100px;
                    -moz-border-radius: 100px;
                }

                .cloud:before {
                    width: 180px; height: 180px;
                    top: -90px; right: 50px;

                    border-radius: 200px;
                    -webkit-border-radius: 200px;
                    -moz-border-radius: 200px;
                }
                
                .x1 {
                    top:-50px;
                    left:100px;
                    -webkit-transform: scale(0.3);
                    -moz-transform: scale(0.3);
                    transform: scale(0.3);
                    opacity: 0.9;
                    -webkit-animation: moveclouds 15s linear infinite;
                    -moz-animation: moveclouds 15s linear infinite;
                    -o-animation: moveclouds 15s linear infinite;
                }
                
                .x1_5{
                    top:-80px;
                    left:250px;
                    -webkit-transform: scale(0.3);
                    -moz-transform: scale(0.3);
                    transform: scale(0.3);
                    -webkit-animation: moveclouds 17s linear infinite;
                    -moz-animation: moveclouds 17s linear infinite;
                    -o-animation: moveclouds 17s linear infinite; 
                }

                .x2 {
                    left: 250px;
                    top:30px;
                    -webkit-transform: scale(0.6);
                    -moz-transform: scale(0.6);
                    transform: scale(0.6);
                    opacity: 0.6; 
                    -webkit-animation: moveclouds 25s linear infinite;
                    -moz-animation: moveclouds 25s linear infinite;
                    -o-animation: moveclouds 25s linear infinite;
                }

                .x3 {
                    left: 250px; bottom: -70px;

                    -webkit-transform: scale(0.6);
                    -moz-transform: scale(0.6);
                    transform: scale(0.6);
                    opacity: 0.8; 

                    -webkit-animation: moveclouds 25s linear infinite;
                    -moz-animation: moveclouds 25s linear infinite;
                    -o-animation: moveclouds 25s linear infinite;
                }

                .x4 {
                    left: 470px; botttom: 20px;

                    -webkit-transform: scale(0.75);
                    -moz-transform: scale(0.75);
                    transform: scale(0.75);
                    opacity: 0.75;

                    -webkit-animation: moveclouds 18s linear infinite;
                    -moz-animation: moveclouds 18s linear infinite;
                    -o-animation: moveclouds 18s linear infinite;
                }

                .x5 {
                    left: 200px; top: 300px;

                    -webkit-transform: scale(0.5);
                    -moz-transform: scale(0.5);
                    transform: scale(0.5);
                    opacity: 0.8; 

                    -webkit-animation: moveclouds 20s linear infinite;
                    -moz-animation: moveclouds 20s linear infinite;
                    -o-animation: moveclouds 20s linear infinite;
                }

                @-webkit-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }
                @-moz-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }
                @-o-keyframes moveclouds {
                    0% {margin-left: 1000px;}
                    100% {margin-left: -1000px;}
                }    
        </style>
      </head>
      <body>
        <div id="clouds">
          <div class="cloud x1"></div>
          <div class="cloud x1_5"></div>
          <div class="cloud x2"></div>
          <div class="cloud x3"></div>
          <div class="cloud x4"></div>
          <div class="cloud x5"></div>
      </div>
      <div class='c'>
          <div class='_404'>500</div>
          <hr>
          <div class='_1'>INTERNAL</div>
          <div class='_1'>SERVER ERROR</div>
          <code class='btn'>The configured backend authentication has been rejected.</code>
      </div>
      </body>
    </html>"};
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
  if (req.backend == F_runtime_adobe_io) {
    set bereq.http.host = "runtime.adobe.io";
  } elsif (req.backend == F_GitHub) {
    set bereq.http.host = "raw.githubusercontent.com";
  }

  # set backend authentication
  if (req.backend == F_runtime_adobe_io) {
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
  if (req.backend == F_runtime_adobe_io) {
    set bereq.http.host = "runtime.adobe.io";
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