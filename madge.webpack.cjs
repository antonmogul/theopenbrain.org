const path = require("path");
module.exports = {
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    extensions: [".js", ".ts", ".vue", ".json"],
  },
};
