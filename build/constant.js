// 读取 package.json 中 config 字段的配置项
const SERVER_HOST = process.env.npm_package_config_host; // 【127.0.0.1 不能使用本机IP】【10.15.45.112 不能使用localhost】【0.0.0.0 两者皆可localhsot，10.15.45.112】
const SERVER_PORT = process.env.npm_package_config_port;

module.exports = {
    SERVER_HOST,
    SERVER_PORT
};