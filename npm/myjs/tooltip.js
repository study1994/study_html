// tooltip.js - 支持 hover + click + 自定义代码高亮（不依赖 Prism）
(function () {
  let hoverTooltip = null;
  let modal = null;

  // 安全转义 HTML（仅用于未处理的文本，但本方案直接生成 HTML，所以用得少）
  function escapeHtml(text) {
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function getPreview(code, maxLines = 2) {
    return code.split('\n').slice(0, maxLines).join('\n');
  }

  // === 核心：自定义代码高亮逻辑 ===
  function customHighlightCode(code) {
    if (!code) return '';
    const lines = code.split('\n');
    const processedLines = lines.map((line, index) => {
      let htmlLine = line;

      // 1. 处理行内代码：`内容` → 绿色加粗
      // 使用非贪婪匹配，支持多个 `` 对
      htmlLine = htmlLine.replace(/`([^`]+)`/g, '<span style="color:green;font-weight:bold">$1</span>');

      // 2. 处理注释：优先 #，再 //
      let commentMatched = false;

      // 匹配 # 注释（允许前面有空格，但不能在字符串内——简化处理）
      const hashMatch = htmlLine.match(/^([^#]*?)(\s*#)(.*)$/);
      if (hashMatch) {
        const before = hashMatch[1];
        const hash = hashMatch[2];
        const comment = hashMatch[3];
        htmlLine = before + hash + '<span style="color:red">' + comment + '</span>';
        commentMatched = true;
      }

      // 如果没匹配到 #，再尝试 //
      if (!commentMatched) {
        const slashMatch = htmlLine.match(/^(.*?)(\s*\/\/)(.*)$/);
        if (slashMatch) {
          const before = slashMatch[1];
          const slashes = slashMatch[2];
          const comment = slashMatch[3];
          htmlLine = before + slashes + '<span style="color:red">' + comment + '</span>';
        }
      }

      // 3. 第一行整体加蓝色+加粗
      if (index === 0) {
        htmlLine = '<span style="color:blue;font-weight:bold">' + htmlLine + '</span>';
      }

      return htmlLine;
    });

    return processedLines.join('\n');
  }

  // === Hover Tooltip（轻量预览）===
  function showHoverTooltip(code, language = 'python') {
    if (hoverTooltip) hoverTooltip.remove();
    const preview = getPreview(code);
    const highlightedPreview = customHighlightCode(preview);

    hoverTooltip = document.createElement('div');
    hoverTooltip.innerHTML = `
      <pre style="
        margin:0; padding:6px 8px;
        background:#333; color:#fff;
        border-radius:4px; font-family:Consolas, monospace, 'Courier New';
        font-size:12px; white-space:pre;
        max-width:300px; overflow:hidden;
        line-height:1.4;
      ">${highlightedPreview}${code.split('\n').length > 2 ? '…' : ''}</pre>
    `;
    hoverTooltip.style.position = 'absolute';
    hoverTooltip.style.zIndex = '10000';
    hoverTooltip.style.pointerEvents = 'none';
    document.body.appendChild(hoverTooltip);
  }

  function hideHoverTooltip() {
    if (hoverTooltip) {
      hoverTooltip.remove();
      hoverTooltip = null;
    }
  }

  // === Click Modal（完整代码查看）===
  function createModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:99999;">
        <div style="background:#1e1e1e;color:#d4d4d4;width:90%;max-width:800px;max-height:80vh;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;font-family:Consolas, monospace;">
          <div style="padding:12px 16px;background:#252526;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
            <span>完整代码</span>
            <button id="close-modal" style="background:none;border:none;color:#ccc;font-size:20px;cursor:pointer;padding:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">&times;</button>
          </div>
          <div style="flex:1;overflow:auto;padding:16px;">
            <pre id="modal-pre" style="margin:0;white-space:pre;tab-size:4;"></pre>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    return modal;
  }

  function closeModal() {
    if (modal) {
      modal.remove();
      modal = null;
    }
  }

  function showCodeInModal(code, language = 'python') {
    const m = createModal();
    const preEl = m.querySelector('#modal-pre');
    const highlightedCode = customHighlightCode(code);
    preEl.innerHTML = highlightedCode; // 直接插入 HTML
    const scrollBox = m.querySelector('div[style*="overflow:auto"]');
    if (scrollBox) scrollBox.scrollTop = 0;
  }

  // === 绑定事件到 Markmap 节点 ===
  function bindEventsToNode(node, code, language = 'python') {
    if (node.hasAttribute('data-interaction-bound')) return;
    node.setAttribute('data-interaction-bound', 'true');

    node.addEventListener('mouseenter', (e) => {
      showHoverTooltip(code, language);
      const rect = node.getBoundingClientRect();
      hoverTooltip.style.left = (rect.right + 8) + 'px';
      hoverTooltip.style.top = (rect.top - 20) + 'px';
    });
    node.addEventListener('mouseleave', hideHoverTooltip);

    node.addEventListener('click', (e) => {
      e.stopPropagation();
      showCodeInModal(code, language);
    });
  }

  // === 初始化：查找所有 .hidden-code 并绑定 ===
  function init() {
    // Markmap 渲染后，节点在 <g class="markmap-node"> 中
    document.querySelectorAll('g.markmap-node').forEach(node => {
      const foreignObj = node.querySelector('foreignObject');
      if (!foreignObj) return;

      const span = foreignObj.querySelector('.hidden-code');
      if (!span) return;

      const code = span.dataset.code;
      if (!code) return;

      // 支持 data-lang 指定语言（虽未用于高亮，但保留）
      const language = span.dataset.lang || 'python';

      bindEventsToNode(node, code, language);
    });
  }

  // 等待 Markmap 渲染完成（简单轮询）
  function waitForMarkmap() {
    if (document.querySelector('g.markmap-node')) {
      init();
    } else {
      setTimeout(waitForMarkmap, 200);
    }
  }

  // 启动
  waitForMarkmap();
})();