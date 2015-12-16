(function() {
  "use strict";

  var LoadContext = function(params, data, mainElem, page) {
    var timeoutHandle;
    var timeout = page.loadTimeout === undefined ? mainElem.defaultLoadTimeout : page.loadTimeout;

    var showWaiting = function(showIt) {
      mainElem.$.hashyPages.style.display = showIt ? "none" : "block";
      var loadingElement = findOrCreateElement(mainElem, mainElem.loadingElement, mainElem.root);
      loadingElement.style.display = showIt ? "block" : "none";
    };

    this.done = function() {
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
      showWaiting(false);
      page.style.display = "block";
    };
    
    this.fail = function(message) {
      if (timeoutHandle !== undefined) {
        window.clearTimeout(timeoutHandle);
      }
      showWaiting(false);
      mainElem.showErrorPage(message);
    };

    this.params = params;
    this.data = data;

    this.start = function() {
      var _this = this;
      showWaiting(true);

      timeoutHandle = window.setTimeout(function() {
        _this.fail("the page timed out");
        _this.done = function() {};
        _this.error = function() {};
      }, timeout);
    };
  };

  function findOrCreateElement(mainElem, elementName, parent) {
    var page = mainElem.$$(elementName);
    if (page === undefined) {
      page = document.createElement(elementName);
      page.container = mainElem;
      page.style.display = "none";
      Polymer.dom(parent).appendChild(page); 
      Polymer.dom.flush();
    }
    return page;
  }

  function parseHashString(hashString) {
    var hashSplit = hashString.split('?');
    var info = { hash: hashSplit[0], params: [] };
    if (hashSplit.length > 1) {
      var keyValues = hashSplit[1].split('&');
      for (var i = 0, l = keyValues.length; i < l; i ++) {
        var kv = keyValues[i];
        var t = kv.split('=');
        info.params[t[0]] = t[1];
      };
    }
    return info;
  }

  if (window.Hashy === undefined) {
    window.Hashy = {};
  }

  window.Hashy.pageContainerBehavior = {
    properties: {
      loginPage: {
        type: String,
        value: "login"
      },
      indexPage: {
        type: String,
        value: "index"
      },
      errorPageElement: {
        type: String,
        value: "hashy-page-error"
      },
      loadingElement: {
        type: String,
        value: "hashy-loading"
      },
      currentPage: {
        type: String,
        value: null
      },
      defaultLoadTimeout: {
        type: Number,
        value: 15000 //15 seconds
      },
      pageData: {
        type: Object,
        value: function() { return {}; }
      }
    },
    pageToElement: function(page) {
      return 'page-' + page;
    },
    startRouting: function() {
      var _this = this;
      window.onhashchange = function() { 
        _this._hashChanged(window.location.hash);
      };
      _this._hashChanged(window.location.hash);
    },
    isAuthenticated: function() {
      return false;
    },
    showPage: function(page, data) {
      this.pageData[page] = data;
      window.location.href = "#" + page;
    },
    _hashChanged: function(hashString) {
      var hashInfo = parseHashString(hashString);
      var page = hashInfo.hash;
      if (page.startsWith("#")) {
        page = page.slice(1);
      } else if (page === "") {
        page = this.indexPage;
      }
      
      if (this.currentPage != null) {
        //hide current page
        this.$$(this.pageToElement(this.currentPage)).style.display = 'none';
      }

      var pageToShow = findOrCreateElement(this, this.pageToElement(page), this.$.hashyPages);

      if (!this.isAuthenticated() && pageToShow.requiresAuth) {
        var loginPage = findOrCreateElement(this, this.pageToElement(this.loginPage), this.$.hashyPages);
        loginPage.nextPage = page;
        location.href="#"+this.loginPage;
        return; //exit and let new hash change come in
      } else {
        this.currentPage = page;
      }


      if (typeof pageToShow.load === 'function') {
        //TODO JQ: support loading js params
        var loadContext = new LoadContext(hashInfo.params, this.pageData[page], this, pageToShow);
        loadContext.start();
        pageToShow.load(loadContext);
      } else {
        pageToShow.style.display = "block";
      }

      if (this.currentPage === this.loginPage && (pageToShow.nextPage == null || pageToShow.nextPage === undefined)) {
        pageToShow.nextPage = page === this.loginPage ? this.indexPage : page;
      }
    },
    getWaitingElement: function() {
      var elem = this.$$(this.loadingElement);
      if (elem === undefined) {
        elem = document.createElement(this.loadingElement);
        elem.style.display = "none";
        Polymer.dom(this.root).appendChild(elem); 
        Polymer.dom.flush();
      }
      return elem;
    },
    showErrorPage: function(message) {
      var page = findOrCreateElement(this, this.errorPageElement, this.$.hashyPages);
      page.message = message;
      page.style.display = "block";
    }
  };

  window.Hashy.pageBehavior = {
    properties: {
      requiresAuth: {
        type: Boolean,
        value: false
      },
      nextPage: {
        type: String,
        value: null
      },
      container: {
        type: Object,
        value: null
      }
    },
    showPage: function(page, data) {
      this.container.showPage(page, data);
    },
    follow: function(e) {
      e.stopPropagation();
      var href = null;
      for (var i = 0, l = e.path.length; i < l; i ++) {
        var pathElement = e.path[i];
        href = pathElement.getAttribute('href');
        if (href !== null) {
          break;
        }
      }

      if (href !== null) {
        location.href = href;
      }
    }
  };
})();
