const path = require('path');
const root = path.resolve(__dirname, '..');
function rootResolve(...args){
    return path.resolve(root, ...args);
}
  
const devMode = process.env.NODE_ENV === 'development';

const pkg_path = rootResolve('package.json');
const pkg = require(pkg_path); // 把 package.json 作为信息源
const banner = `
${pkg.name}
${pkg.description}\n
@version v${pkg.version}
@homepage ${pkg.homepage}
@repository ${pkg.repository.url}\n
(c) 2023 Cole.yu
Released under the MIT License.
hash: [hash]
`;

module.exports = {
    rootResolve,
    devMode,
    banner
}