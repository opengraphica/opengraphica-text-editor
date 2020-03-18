const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = [
    {
        entry: path.join(__dirname, '/src/text-editor.js'),
        output: {
            library: 'OpenGraphicaTextEditor',
            libraryTarget: 'window',
            filename: 'opengraphica-text-editor.js',
            path: path.resolve(__dirname, 'dist')
        }
    },
    {
        entry: path.join(__dirname, '/src/text-editor.js'),
        output: {
            libraryTarget: 'commonjs',
            filename: 'opengraphica-text-editor.common.js',
            path: path.resolve(__dirname, 'dist')
        },
        plugins: [
            new CopyWebpackPlugin([
                { from: path.join(__dirname, 'src/text-editor.css'), to: path.join(__dirname, 'dist/opengraphica-text-editor.css') }
            ])
        ]
    }
];