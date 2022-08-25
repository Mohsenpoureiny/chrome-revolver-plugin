var ReloadPlugin = function (settings) {
  var self = this;
  self.update(settings);
  self.isGoing = false;

  chrome.tabs.onActivated.addListener(function (activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function (t) {
      self.currentTab = t;
      if (self.isGoing) {
        self.startTimer();
      }
    });
  });
};

ReloadPlugin.prototype.update = function (settings) {
  var self = this;
  self.timeDelay = settings.seconds || 10;
  self.tabReload = settings.reload || true;
  self.tabInactive = settings.inactive || false;
  self.tabReCheck = settings.reCheck || [];
  self.tabAutostart = settings.autostart || false;
  self.noRefreshList = settings.noRefreshList || [];
  self.reloadTabIds = settings.reloadTabIds || [];
};

ReloadPlugin.prototype.start = function () {
  var self = this;
  self.isGoing = true;
  self.getActiveTab(function (tab) {
    self.currentTab = tab;
    self.startTimer();
  });
};

ReloadPlugin.prototype.stop = function () {
  var self = this;
  self.isGoing = false;
  clearTimeout(self.timer);
};

ReloadPlugin.prototype.startTimer = function () {
  var self = this;
  clearTimeout(self.timer);
  self.timer = setTimeout(function () {
    self.loadNextTab();
  }, self.timeDelay * 1000);
};

ReloadPlugin.prototype.getActiveTab = function (cb) {
  chrome.tabs.query({
    'active': true,
    'windowId': self.currentWindow
  }, function (tab) {
    cb(tab[0]);
  });
};

ReloadPlugin.prototype.loadNextTab = function () {
  var self = this;
  var ix = self.currentTab.index + 1;

  chrome.tabs.query({ windowId: self.currentWindow }, function (tabs) {
    if (ix >= tabs.length) {
      ix = 0;
    }

    var nextTab = tabs.filter(function (t) {
      return t.index === ix;
    });
    if (self.tabReCheck.length !== 0) {
      console.log(tabs, "tabs");
      tabs.forEach((tab) => {
        let includesTab = false;
        self.tabReCheck.forEach((rtab) => {
          if (tab.id === rtab.id) {
            includesTab = true;
          }
        });
        console.log(tab, includesTab);
        if (!includesTab && tab.id) {
          chrome.tabs.remove(tab.id);
        }
      });
      self.tabReCheck.forEach((tab) => {
        let includesTab = false;
        tabs.forEach((rtab) => {
          if (tab.id === rtab.id) {
            includesTab = true;
          }
        });
        if (!includesTab) {
          chrome.tabs.create({
            url: tab.url,
            index: tab.index,
            active: false,
          });
        }
      });

      chrome.tabs.query({ windowId: self.currentWindow }, function (newtabs) {
        console.log(newtabs, "tabstabstab3s");
        self.tabReCheck = newtabs || [];
        let newSetting = {};
        newSetting.seconds = self.timeDelay || 10;
        newSetting.reload = self.tabReload || true;
        newSetting.inactive = self.tabInactive || false;
        newSetting.reCheck = newtabs;
        newSetting.autostart = self.tabAutostart || false;
        newSetting.noRefreshList = self.noRefreshList || [];
        newSetting.reloadTabIds = self.reloadTabIds || [];
        console.log(newSetting, "newSetting");
        chrome.windows.getCurrent(function (win) {
          var inst = bg.getInstance(win.id);
          inst.update(newSetting);
        });
        chrome.storage.sync.set(newSetting);
      });
    }
    if (nextTab.length > 0) {
      const selectedNextTab = nextTab[0];
      self.activateTab(nextTab[0]);
    }
  });
};

ReloadPlugin.prototype.shouldReloadTab = function (id) {
  var self = this;
  return (self.tabReload && self.reloadTabIds.length === 0)
    || (self.reloadTabIds.indexOf(id) > -1);
};

ReloadPlugin.prototype.activateTab = function (tab) {
  var self = this;
  function setTabActive() {
    chrome.tabs.update(tab.id, { active: true }, function () {
      self.startTimer();
    });
  }
  if (self.shouldReloadTab(tab.id)) {
    chrome.tabs.onUpdated.addListener(function tabLoadComplete(tabId, info, t) {
      if (info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(tabLoadComplete);
        setTabActive();
      }
    });
    chrome.tabs.reload(tab.id, {}, null);
  }
  else {
    setTabActive();
  }
};

ReloadPlugin.prototype.destroy = function () {
  self.timer = null;
};