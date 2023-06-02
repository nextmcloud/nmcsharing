(function() {
	console.log('PLUGIN OF NMC_SHARING!')
	OCA.Files.HelloWorldPlugin = {
		attach: function(fileList) {
      // Remove hidden element from vue mounting space
      document.querySelector('#app-content-nmc_sharing').classList.remove("hidden")
		},
	};

	OC.Plugins.register('OCA.Files.FileList', OCA.Theming.HelloWorldPlugin)

})();