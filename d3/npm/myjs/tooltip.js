// tooltip.js - 所有弹出窗口均为白色背景（最终修复版）
(function () {
    let hoverTooltip = null;
    let modal = null;
    let hideTooltipTimer = null;
    let isInitialized = false;

    // === 核心：自定义高亮函数 ===
    function customHighlightCode(code) {
        if (!code) return '';
        code = code.replace(/&#10;/g, '\n');
        const lines = code.split('\n');

        return lines.map((line, index) => {
            let processedLine = line;

            // 1. 处理行内代码：`内容` → 绿色加粗
            processedLine = processedLine.replace(/`([^`]+)`/g, '<span style="color:green;font-weight:bold">$1</span>');

            // 2. 检测注释：# 或 //
            let commentPart = '';
            let codePart = processedLine;
            let hasComment = false;

            const hashMatch = processedLine.match(/^([^#]*?)(\s*#.*)$/);
            if (hashMatch && !/['"`]/.test(hashMatch[1])) {
                codePart = hashMatch[1];
                commentPart = hashMatch[2];
                hasComment = true;
            } else {
                const slashMatch = processedLine.match(/^(.*?)(\s*\/\/.*)$/);
                if (slashMatch && !/['"`]/.test(slashMatch[1])) {
                    codePart = slashMatch[1];
                    commentPart = slashMatch[2];
                    hasComment = true;
                }
            }

            // 3. 第一行：codePart → 红+粗，commentPart → 蓝
            if (index === 0) {
                if (hasComment) {
                    const codeStyled = codePart ? `<span style="color:red;font-weight:bold">${codePart}</span>` : '';
                    const commentStyled = `<span style="color:blue">${commentPart}</span>`;
                    return codeStyled + commentStyled;
                } else {
                    return `<span style="color:red;font-weight:bold">${processedLine}</span>`;
                }
            } else {
                // 非第一行：注释 → 蓝
                if (hasComment) {
                    return codePart + `<span style="color:blue">${commentPart}</span>`;
                } else {
                    return processedLine;
                }
            }
        }).join('\n');
    }

    // === Hover Tooltip（最多约300行，可垂直滚动）===
    function showHoverTooltip(code) {
        if (hideTooltipTimer) clearTimeout(hideTooltipTimer);
        if (hoverTooltip) hoverTooltip.remove();

        const lines = code.split('\n');
        const previewLines = lines.slice(0, 300); // 最多300行
        const highlighted = customHighlightCode(previewLines.join('\n'));
        const isTruncated = lines.length > 300;

        hoverTooltip = document.createElement('div');
        hoverTooltip.innerHTML = `
            <pre style="
                margin: 0;
                padding: 8px 10px;
                background: #ffffff;
                color: #000000;
                border: 1px solid #ccc;
                border-radius: 6px;
                font-family: Consolas, 'Courier New', monospace;
                font-size: 12px;
                line-height: 1.4;
                white-space: pre;          /* 保留原始换行 */
                word-wrap: normal;         /* 禁止自动折行 */
                overflow-x: auto;          /* 水平滚动（长行）*/
                overflow-y: auto;          /* 垂直滚动（超过300行）*/
                max-height: 600px;         /* 增大高度 */
                max-width: 600px;          /* 增大宽度 */
                min-width: 400px;          /* 最小宽度 */
                min-height: 300px;         /* 最小高度 */
                display: block;
                box-sizing: border-box;    /* 确保 padding 包含在高度内 */
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            ">${highlighted}${isTruncated ? '\n…' : ''}</pre>
        `;
        hoverTooltip.style.position = 'absolute';
        hoverTooltip.style.zIndex = '999999';
        hoverTooltip.style.pointerEvents = 'auto';

        document.body.appendChild(hoverTooltip);

        // 定位 tooltip
        const rect = document.querySelector('g.markmap-node:hover')?.getBoundingClientRect() ||
            { top: 100, right: 100 };
        const tooltipWidth = Math.min(600, window.innerWidth - 20);
        const tooltipHeight = Math.min(600, window.innerHeight - 20);
        let left = rect.right + 5;
        let top = rect.top;

        if (left + tooltipWidth > window.innerWidth) {
            left = window.innerWidth - tooltipWidth - 10;
        }
        if (top < 10) top = 10;
        if (top + tooltipHeight > window.innerHeight) {
            top = window.innerHeight - tooltipHeight - 10;
        }

        hoverTooltip.style.left = left + 'px';
        hoverTooltip.style.top = top + 'px';

        // 防止鼠标移到 tooltip 上时关闭
        hoverTooltip.addEventListener('mouseenter', () => {
            if (hideTooltipTimer) clearTimeout(hideTooltipTimer);
        });
        hoverTooltip.addEventListener('mouseleave', hideHoverTooltipDebounced);
        
        // 在弹窗上阻止滚轮事件冒泡，防止页面缩放
        hoverTooltip.addEventListener('wheel', (e) => {
            e.stopPropagation(); // 阻止事件冒泡到页面，防止页面缩放
            // 允许默认的滚动行为在弹窗内进行
        }, { passive: true });
    }

    function hideHoverTooltipDebounced() {
        if (hideTooltipTimer) clearTimeout(hideTooltipTimer);
        hideTooltipTimer = setTimeout(() => {
            if (hoverTooltip) {
                hoverTooltip.remove();
                hoverTooltip = null;
            }
        }, 200);
    }

    // === Modal（完整代码）===
    function createModal() {
        if (modal) return modal;
        modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:99999;">
                <div style="background:#ffffff;
                            color:#000000;
                            width:95%;max-width:1200px;max-height:95vh;height:95vh;
                            border-radius:8px;
                            overflow:hidden;
                            display:flex;flex-direction:column;
                            font-family:Consolas, 'Courier New', monospace;
                            box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
                    <div style="padding:12px 16px;
                                background:#f8f8f8;
                                font-size:14px;
                                display:flex;justify-content:space-between;align-items:center;
                                border-bottom:1px solid #eee;
                                flex-shrink:0;">
                        <span>完整代码</span>
                        <button id="close-modal" style="background:none;border:none;color:#999;font-size:20px;cursor:pointer;">&times;</button>
                    </div>
                    <div style="flex:1;overflow:auto;overflow-x:auto;overflow-y:auto;padding:16px;background:#fff;min-height:0;">
                        <pre id="modal-pre" style="margin:0;white-space:pre;tab-size:4;color:#000;word-wrap:normal;overflow:visible;"></pre>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#close-modal').onclick = () => { modal.remove(); modal = null; };
        modal.onclick = (e) => { if (e.target === modal) { modal.remove(); modal = null; } };
        
        // 在 modal 上阻止滚轮事件冒泡，防止页面缩放
        const modalContent = modal.querySelector('div[style*="overflow:auto"]');
        if (modalContent) {
            modalContent.addEventListener('wheel', (e) => {
                e.stopPropagation(); // 阻止事件冒泡到页面，防止页面缩放
            }, { passive: true });
        }
        
        // 在整个 modal 上阻止滚轮事件冒泡
        modal.addEventListener('wheel', (e) => {
            e.stopPropagation(); // 阻止事件冒泡到页面，防止页面缩放
        }, { passive: true });
        
        return modal;
    }

    function showCodeInModal(code) {
        const m = createModal();
        const pre = m.querySelector('#modal-pre');
        pre.innerHTML = customHighlightCode(code);
        const scrollBox = m.querySelector('div[style*="overflow:auto"]');
        if (scrollBox) scrollBox.scrollTop = 0;
    }

    // === 绑定事件到节点 ===
    function bindEventsToNode(node, code) {
        if (node.hasAttribute('data-tooltip-bound')) return;
        node.setAttribute('data-tooltip-bound', 'true');

        node.addEventListener('mouseenter', () => {
            showHoverTooltip(code);
        });
        node.addEventListener('mouseleave', hideHoverTooltipDebounced);
        node.addEventListener('click', (e) => {
            e.stopPropagation();
            showCodeInModal(code);
        });
    }

    // === 初始化：查找所有带 data-code 的 .hidden-code 元素 ===
    function init() {
        const spans = document.querySelectorAll('g.markmap-node foreignObject .hidden-code');
        if (spans.length === 0) return;

        spans.forEach(span => {
            const node = span.closest('g.markmap-node');
            if (!node || node.hasAttribute('data-tooltip-bound')) return;
            const code = span.dataset.code;
            if (!code) return;
            bindEventsToNode(node, code);
        });
    }

    // === 监听 DOM 变化（兼容动态 markmap 渲染）===
    function startObserver() {
        init(); // 立即尝试

        const observer = new MutationObserver((mutations) => {
            let needReinit = false;
            for (const mut of mutations) {
                if (mut.type === 'childList' && mut.addedNodes.length > 0) {
                    for (const node of mut.addedNodes) {
                        if (node.nodeType === 1) {
                            if (
                                node.matches?.('g.markmap-node') ||
                                node.querySelector?.('g.markmap-node .hidden-code')
                            ) {
                                needReinit = true;
                                break;
                            }
                        }
                    }
                }
                if (needReinit) break;
            }
            if (needReinit) {
                // 延迟初始化，确保 DOM 渲染完成
                setTimeout(init, 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // === 处理 SVG 画布的滚轮事件：上下移动而不是缩放 ===
    function setupSvgWheelHandler() {
        const svg = document.querySelector('svg#mindmap');
        if (!svg) return;
        
        // 检查是否已经绑定过
        if (svg.hasAttribute('data-wheel-handler-bound')) return;
        svg.setAttribute('data-wheel-handler-bound', 'true');
        
        svg.addEventListener('wheel', (e) => {
            // 如果鼠标在弹窗上，不处理
            if (hoverTooltip && hoverTooltip.contains(e.target)) return;
            if (modal && modal.contains(e.target)) return;
            
            // 阻止默认的缩放行为
            e.preventDefault();
            e.stopPropagation();
            
            // 查找所有可能的 transform 容器（markmap 可能使用不同的结构）
            const transformElements = svg.querySelectorAll('g[transform]');
            if (transformElements.length === 0) return;
            
            // 通常第一个 g 元素包含主要的 transform
            const g = transformElements[0];
            if (!g) return;
            
            // 获取当前的 transform
            const transform = g.getAttribute('transform') || '';
            let translateX = 0;
            let translateY = 0;
            let scale = 1;
            
            // 解析 transform（支持多种格式）
            const translateMatch = transform.match(/translate\(([^,]+),([^)]+)\)/);
            if (translateMatch) {
                translateX = parseFloat(translateMatch[1].trim()) || 0;
                translateY = parseFloat(translateMatch[2].trim()) || 0;
            }
            
            const scaleMatch = transform.match(/scale\(([^)]+)\)/);
            if (scaleMatch) {
                scale = parseFloat(scaleMatch[1].trim()) || 1;
            }
            
            // 计算滚动的距离（垂直滚动）
            const deltaY = e.deltaY;
            const scrollSpeed = 30; // 滚动速度
            
            // 更新 translateY（上下移动）
            translateY += deltaY * scrollSpeed / Math.max(scale, 0.1);
            
            // 构建新的 transform
            let newTransform = `translate(${translateX},${translateY})`;
            if (scale !== 1) {
                newTransform += ` scale(${scale})`;
            }
            
            g.setAttribute('transform', newTransform);
        }, { passive: false });
    }
    
    // 启动
    function initialize() {
        startObserver();
        // 延迟设置 SVG 滚轮处理，确保 SVG 已渲染
        setTimeout(() => {
            setupSvgWheelHandler();
            // 如果 SVG 是动态加载的，也需要监听
            const svgObserver = new MutationObserver(() => {
                setupSvgWheelHandler();
            });
            svgObserver.observe(document.body, {
                childList: true,
                subtree: true
            });
        }, 500);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }
})();