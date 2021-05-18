const path = require("path");

module.exports = {
  optimization: {
    minimize: false
  },
  entry: "./src/index.js",
  plugins: [],
  module: {
    rules: [
      {
        test: /\.m?js$/,
        enforce: "pre",
        use: ["source-map-loader"],
      },
      {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader"
        }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ]
  },
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "umd",
    library: "react-webdocker"
  },
    externals: {      
        // Don't bundle react or react-dom      
        react: {          
            commonjs: "react",          
            commonjs2: "react",          
            amd: "react",          
            root: "React"      
        },
        "react-dom": {          
            commonjs: "react-dom",          
            commonjs2: "react-dom",          
            amd: "react-dom",          
            root: "ReactDOM"      
        },
        "@material-ui/core": {          
            commonjs: "@material-ui/core",          
            commonjs2: "@material-ui/core",          
            amd: "@material-ui/core",          
            root: "MaterialUI"      
        }  
    } 
};



