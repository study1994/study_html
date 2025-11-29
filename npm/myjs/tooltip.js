// tooltip.js - 自定义高亮：第一行红粗，注释蓝（不粗），`code`绿粗
(function () {
  let hoverTooltip = null;
  let modal = null;

  // === 核心：自定义高亮函数 ===
  function customHighlightCode(code) {
    if (!code) return '';
    code = code.replace(/&#10;/g, '\n');
    const lines = code.split('\n');

    return lines.map((line, index) => {
      let processedLine = line;

      // 1. 处理行内代码：`内容` → 绿色加粗（所有行）
      processedLine = processedLine.replace(/`([^`]+)`/g, '<span style="color:green;font-weight:bold">$1</span>');

      // 2. 检测注释：# 或 //
      let commentPart = '';
      let codePart = processedLine;
      let hasComment = false;

      // 匹配 # 注释（前面不能有 ' " `）
      const hashMatch = processedLine.match(/^([^#]*?)(\s*#.*)$/);
      if (hashMatch && !/['"`]/.test(hashMatch[1])) {
        codePart = hashMatch[1];
        commentPart = hashMatch[2];
        hasComment = true;
      } else {
        // 匹配 // 注释
        const slashMatch = processedLine.match(/^(.*?)(\s*\/\/.*)$/);
        if (slashMatch && !/['"`]/.test(slashMatch[1])) {
          codePart = slashMatch[1];
          commentPart = slashMatch[2];
          hasComment = true;
        }
      }

      // 3. 第一行特殊处理：codePart → 红+粗，commentPart → 蓝（不粗）
      if (index === 0) {
        if (hasComment) {
          const codeStyled = codePart ? `<span style="color:red;font-weight:bold">${codePart}</span>` : '';
          const commentStyled = `<span style="color:blue">${commentPart}</span>`;
          return codeStyled + commentStyled;
        } else {
          // 整行无注释：全红加粗
          return `<span style="color:red;font-weight:bold">${processedLine}</span>`;
        }
      } else {
        // 非第一行：注释部分 → 蓝色（不加粗），其余保持原样
        if (hasComment) {
          return codePart + `<span style="color:blue">${commentPart}</span>`;
        } else {
          return processedLine;
        }
      }
    }).join('\n');
  }

  // === Hover Tooltip ===
  function showHoverTooltip(code) {
    if (hoverTooltip) hoverTooltip.remove();
    const preview = code.split('\n').slice(0, 2).join('\n');
    const highlighted = customHighlightCode(preview);

    hoverTooltip = document.createElement('div');
    hoverTooltip.innerHTML = `
      <pre style="
        margin:0; padding:6px 8px;
        background:#333; color:#fff;
        border-radius:4px;
        font-family:Consolas, monospace;
        font-size:12px;
        white-space:pre;
        max-width:300px;
        overflow:hidden;
        line-height:1.4;
      ">${highlighted}${code.split('\n').length > 2 ? '…' : ''}</pre>
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

  // === Modal ===
  function createModal() {
    if (modal) return modal;
    modal = document.createElement('div');
    modal.innerHTML = `
      <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:99999;">
        <div style="background:#1e1e1e;color:#d4d4d4;width:90%;max-width:800px;max-height:80vh;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;font-family:Consolas, monospace;">
          <div style="padding:12px 16px;background:#252526;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
            <span>完整代码</span>
            <button id="close-modal" style="background:none;border:none;color:#ccc;font-size:20px;cursor:pointer;">&times;</button>
          </div>
          <div style="flex:1;overflow:auto;padding:16px;">
            <pre id="modal-pre" style="margin:0;white-space:pre;tab-size:4;"></pre>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#close-modal').onclick = () => { modal.remove(); modal = null; };
    modal.onclick = (e) => { if (e.target === modal) { modal.remove(); modal = null; } };
    return modal;
  }

  function showCodeInModal(code) {
    const m = createModal();
    const pre = m.querySelector('#modal-pre');
    pre.innerHTML = customHighlightCode(code);
    const scrollBox = m.querySelector('div[style*="overflow:auto"]');
    if (scrollBox) scrollBox.scrollTop = 0;
  }

  // === 绑定事件 ===
  function bindEventsToNode(node, code) {
    if (node.hasAttribute('data-tooltip-bound')) return;
    node.setAttribute('data-tooltip-bound', 'true');

    node.addEventListener('mouseenter', (e) => {
      showHoverTooltip(code);
      const rect = node.getBoundingClientRect();
      hoverTooltip.style.left = (rect.right + 8) + 'px';
      hoverTooltip.style.top = (rect.top - 20) + 'px';
    });
    node.addEventListener('mouseleave', hideHoverTooltip);
    node.addEventListener('click', (e) => {
      e.stopPropagation();
      showCodeInModal(code);
    });
  }

  // === 初始化 ===
  function init() {
    document.querySelectorAll('g.markmap-node foreignObject .hidden-code').forEach(span => {
      const node = span.closest('g.markmap-node');
      if (!node) return;
      const code = span.dataset.code;
      if (!code) return;
      bindEventsToNode(node, code);
    });
  }

  // === 等待 Markmap 渲染 ===
  function waitForMarkmap() {
    if (document.querySelector('g.markmap-node foreignObject .hidden-code')) {
      init();
    } else {
      setTimeout(waitForMarkmap, 300);
    }
  }

  setTimeout(waitForMarkmap, 500);
})();