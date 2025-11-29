// tooltip.js - 支持 hover + click + 语法高亮（Prism.js）

(function () {
    let hoverTooltip = null;
    let modal = null;
  
    function escapeHtml(text) {
      return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
  
    function getPreview(code, maxLines = 2) {
      return code.split('\n').slice(0, maxLines).join('\n');
    }
  
    // === 高亮代码函数 ===
    function highlightCode(code, language = 'python') {
      const codeEl = document.createElement('code');
      codeEl.className = `language-${language}`;
      codeEl.textContent = code;
      // 等待 Prism 加载后高亮（异步安全）
      if (window.Prism) {
        Prism.highlightElement(codeEl);
      }
      return codeEl;
    }
  
    // === Hover Tooltip（轻量，不强制高亮，可选）===
    function showHoverTooltip(code, language = 'python') {
      if (hoverTooltip) hoverTooltip.remove();
      const preview = getPreview(code);
      hoverTooltip = document.createElement('div');
      hoverTooltip.innerHTML = `<pre style="
        margin:0; padding:6px 8px;
        background:#333; color:#fff;
        border-radius:4px; font-family:Consolas, monospace;
        font-size:12px; white-space:pre;
        max-width:300px; overflow:hidden;
      ">${escapeHtml(preview)}${code.split('\n').length > 2 ? '…' : ''}</pre>`;
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
  
    // === Click Modal（带完整高亮）===
    function createModal() {
      if (modal) return modal;
      modal = document.createElement('div');
      modal.innerHTML = `
        <div style="position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.6);display:flex;justify-content:center;align-items:center;z-index:99999;">
          <div style="background:#1e1e1e;color:#d4d4d4;width:90%;max-width:800px;max-height:80vh;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;">
            <div style="padding:12px 16px;background:#252526;font-family:sans-serif;font-size:14px;display:flex;justify-content:space-between;align-items:center;">
              <span>完整代码</span>
              <button id="close-modal" style="background:none;border:none;color:#ccc;font-size:20px;cursor:pointer;padding:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">&times;</button>
            </div>
            <div style="flex:1;overflow:auto;padding:16px;">
              <pre><code id="modal-code"></code></pre>
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
      const codeEl = m.querySelector('#modal-code');
      codeEl.className = `language-${language}`;
      codeEl.textContent = code;
      // 高亮
      if (window.Prism) {
        Prism.highlightElement(codeEl);
      }
      const scrollBox = m.querySelector('div[style*="overflow:auto"]');
      if (scrollBox) scrollBox.scrollTop = 0;
    }
  
    // === 绑定事件 ===
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
  
    // === 初始化 ===
    function init() {
      document.querySelectorAll('g.markmap-node').forEach(node => {
        const foreignObj = node.querySelector('foreignObject');
        if (!foreignObj) return;
  
        const span = foreignObj.querySelector('.hidden-code');
        if (!span) return;
  
        const code = span.dataset.code;
        if (!code) return;
  
        // 可选：支持指定语言，如 data-lang="javascript"
        const language = span.dataset.lang || 'python';
  
        bindEventsToNode(node, code, language);
      });
    }
  
    // 等待 Prism 和 markmap 都准备好
    function waitForPrism() {
      if (window.Prism && typeof Prism.highlightElement === 'function') {
        init();
      } else {
        setTimeout(waitForPrism, 100);
      }
    }
  
    setTimeout(waitForPrism, 600);
  })();