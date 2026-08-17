let websiteVersion = Date.now();

const getWebsiteVersion = () => {
  return websiteVersion;
};

const bumpWebsiteVersion = () => {
  websiteVersion = Date.now();

  console.log(
    "🌐 Website version updated:",
    websiteVersion
  );

  return websiteVersion;
};

module.exports = {
  getWebsiteVersion,
  bumpWebsiteVersion,
};