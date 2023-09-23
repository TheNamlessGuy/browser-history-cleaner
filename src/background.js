const Background = {
  main: async function() {
    await Communication.init();
    await Opts.init();
    await HistoryManager.init();
  },
};

Background.main();