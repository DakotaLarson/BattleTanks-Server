const path = require('path');
const fs = require('fs');

module.exports = (env, argv) => {

    let nodeModules = {};
    fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

    let config = {
        target: 'node',
        mode: "production",
        entry: {
            app: [
                'babel-polyfill',
                './App.js'
            ],
        },
        output: {
            path: path.resolve(__dirname, 'build/prod'),
            filename: 'server.js',
        },
        module: {
            rules: [{
                test: /\.js?$/,
                exclude: /node_modules/,
                loader: 'babel-loader',
                query: {
                    presets: ['env', 'stage-0']
                }
            }]
        },
        resolve: {
            modules: [
                path.resolve('./'),
                //path.resolve('./node_modules')
            ]
        },
        externals: nodeModules
    };
    if(argv.mode !== 'production'){
        config.devtool = "source-map";
        config.mode = 'development';
        config.output.path = path.resolve(__dirname, 'build');
    }
    return config;
};