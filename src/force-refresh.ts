#!/usr/bin/env node
/**
 * 强制刷新脚本 - 确保能够读取最新的统计数据
 * 直接测试文件读取是否显示最新数据
 */

import * as fs from 'fs';
import * as path from 'path';

// 直接读取stats文件的路径
const STATS_FILE = path.join(
    process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME || '', '.claude'),
    'modelstats.json'
);

// 测试函数
function testRealTimeData() {
    console.log('=== 实时数据测试 ===');

    try {
        if (fs.existsSync(STATS_FILE)) {
            // 第一次读取
            const data1 = fs.readFileSync(STATS_FILE, 'utf-8');
            const stats1 = JSON.parse(data1);
            console.log('第一次读取：', JSON.stringify(stats1, null, 2));

            // 等待1秒
            console.log('\n等待1秒...');
            setTimeout(() => {
                // 第二次读取
                const data2 = fs.readFileSync(STATS_FILE, 'utf-8');
                const stats2 = JSON.parse(data2);
                console.log('第二次读取：', JSON.stringify(stats2, null, 2));

                // 比较
                if (stats1.totalTokens === stats2.totalTokens) {
                    console.log('\n⚠️ 警告：两次读取的数据相同，可能没有实时更新');
                } else {
                    console.log('\n✅ 实时更新工作正常');
                }
            }, 1000);
        } else {
            console.log('统计文件不存在：', STATS_FILE);
        }
    } catch (error) {
        console.error('测试错误：', error);
    }
}

// 通过hook测试实时更新
function testHookUpdate() {
    console.log('\n=== Hook实时更新测试 ===');

    // 创建测试hook数据
    const hookScript = path.join(__dirname, '../../dist/hook-handler.js');

    // 使用子进程执行hook更新
    const { exec } = require('child_process');

    console.log('发送hook更新...');
    exec(`node ${hookScript} --hook=cost-tracker "{\"input_tokens\":50,\"output_tokens\":25,\"model\":\"TestModel\"}"`, (err: Error | null, stdout: string, stderr: string) => {
        if (err) {
            console.error('Hook执行错误：', err);
            return;
        }
        console.log('Hook完成，检查更新...');

        // 检查更新后的数据
        try {
            const data = fs.readFileSync(STATS_FILE, 'utf-8');
            const stats = JSON.parse(data);
            console.log('更新后数据：', JSON.stringify(stats, null, 2));

            if (stats.totalTokens > 0) {
                console.log('✅ Hook更新成功');
            } else {
                console.log('⚠️ Hook更新可能未生效');
            }
        } catch (error) {
            console.error('读取更新数据错误：', error);
        }
    });
}

// 运行测试
testRealTimeData();
testHookUpdate();