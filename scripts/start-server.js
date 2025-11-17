#!/usr/bin/env node
/**
 * 启动本地 Pokemon Showdown 服务器
 * 用于 PokéChamp AI 本地对战
 */

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Pokemon Showdown 服务器路径
const showdownPath = path.join(__dirname, '..', 'node_modules', 'pokemon-showdown');
const projectRoot = path.join(__dirname, '..');
const projectConfigPath = path.join(projectRoot, 'config', 'server-config.js');
const showdownConfigPath = path.join(showdownPath, 'config', 'config.js');

// 使用项目配置文件
console.log('⚙️  配置本地服务器...');
try {
    // 检查项目配置文件是否存在
    if (fs.existsSync(projectConfigPath)) {
        // 复制项目配置到 Pokemon Showdown 配置目录
        const projectConfig = fs.readFileSync(projectConfigPath, 'utf8');
        fs.writeFileSync(showdownConfigPath, projectConfig, 'utf8');
        console.log(`✓ 已使用项目配置: ${projectConfigPath}`);
    } else {
        console.warn('⚠️  项目配置文件不存在，使用默认配置');
    }
} catch (error) {
    console.warn('⚠️  配置文件复制失败，使用默认配置:', error.message);
}

console.log('🚀 启动 Pokemon Showdown 本地服务器...');
console.log(`📁 服务器路径: ${showdownPath}`);
console.log(`📁 配置文件: ${projectConfigPath}`);
console.log(`🌐 服务器地址: http://localhost:8000`);
console.log('');

// 启动服务器（使用 --no-security 参数以支持本地开发）
const server = spawn('node', ['pokemon-showdown', 'start', '--no-security'], {
	cwd: showdownPath,
	stdio: 'inherit',
	shell: true
});

server.on('error', (error) => {
	console.error('❌ 服务器启动失败:', error);
	process.exit(1);
});

server.on('exit', (code) => {
	if (code !== 0) {
		console.log(`\n❌ 服务器退出，代码: ${code}`);
	} else {
		console.log('\n✅ 服务器已停止');
	}
});

// 处理Ctrl+C
process.on('SIGINT', () => {
	console.log('\n\n停止服务器...');
	server.kill('SIGINT');
	process.exit(0);
});
