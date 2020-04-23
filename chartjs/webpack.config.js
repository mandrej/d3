const path = require('path');
const webpack = require('webpack');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        app: './src/index.js'
    },
    plugins: [
        new CopyPlugin([
            {
                from: './src/styles.css',
                to: './styles.css',
            }
        ]),
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            inject: 'body',
            template: './src/index.html',
            filename: 'index.html'
        }),
        new webpack.HotModuleReplacementPlugin({})
    ],
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.[hash].js',
        library: 'mda'
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: [/node_modules/],
                use: [{
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env']
                    }
                }]
            }
        ]
    },
    devServer: {
        contentBase: path.join(__dirname, 'dist'),
        compress: true,
        port: 3000,
        hot: true
    }
};