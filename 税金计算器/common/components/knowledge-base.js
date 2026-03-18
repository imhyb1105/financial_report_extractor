/**
 * 知识库手风琴组件
 * 用于展示税种知识库内容，支持Markdown渲染
 */

class KnowledgeBase {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      knowledgePath: options.knowledgePath || './',
      items: options.items || [],
      expandFirst: options.expandFirst !== false,
      ...options
    };
    this.expandedItems = new Set();
    this.loadedContents = new Map();
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    if (this.options.expandFirst && this.options.items.length > 0) {
      this.toggleItem(0);
    }
  }

  // 获取图标类型
  getIconType(index, title) {
    const titleLower = title.toLowerCase();
    if (titleLower.includes('基础') || titleLower.includes('概述')) return 'basics';
    if (titleLower.includes('税率') || titleLower.includes('税额')) return 'rates';
    if (titleLower.includes('规定') || titleLower.includes('政策')) return 'rules';
    if (titleLower.includes('计算') || titleLower.includes('方法')) return 'calc';
    if (titleLower.includes('调整') || titleLower.includes('特殊')) return 'adjust';
    return 'basics';
  }

  // 获取图标
  getIcon(type) {
    const icons = {
      basics: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/></svg>',
      rates: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/></svg>',
      rules: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5V2zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1H4z"/></svg>',
      calc: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h8zM4 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H4z"/><path d="M4 2.5a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-7a.5.5 0 0 1-.5-.5v-2zm0 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3-6a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm0 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-4z"/></svg>',
      adjust: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M7.5 1a.5.5 0 0 0-.5.5v1.293L4.354 3.146a.5.5 0 1 0 .707.708L7 2.914V5.5a.5.5 0 0 0 1 0V2.914l1.939 1.94a.5.5 0 1 0 .707-.708L7.5 1.793V1.5A.5.5 0 0 0 7.5 1zM2 6a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11A.5.5 0 0 1 2 6zm0 2a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 2 8zm0 3a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm0 2a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5z"/></svg>'
    };
    return icons[type] || icons.basics;
  }

  render() {
    const itemsHtml = this.options.items.map((item, index) => {
      const iconType = this.getIconType(index, item.title);
      return `
        <div class="knowledge-item" data-index="${index}">
          <div class="knowledge-header" data-index="${index}">
            <div class="knowledge-icon ${iconType}">
              ${this.getIcon(iconType)}
            </div>
            <span class="knowledge-title">${item.title}</span>
            <span class="knowledge-arrow">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
              </svg>
            </span>
          </div>
          <div class="knowledge-content" data-index="${index}">
            <div class="knowledge-content-inner">
              <div class="knowledge-loading">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                <span>正在加载内容...</span>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="knowledge-base">
        <div class="card">
          <div class="card-header">
            <h5>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
              </svg>
              知识库与政策依据
            </h5>
            <button class="btn btn-expand-all" id="btnExpandAll">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
              </svg>
              全部展开
            </button>
          </div>
          <div class="card-body">
            <div class="knowledge-accordion">
              ${itemsHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // 点击标题切换展开/折叠
    this.container.querySelectorAll('.knowledge-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const index = parseInt(e.currentTarget.dataset.index);
        this.toggleItem(index);
      });
    });

    // 全部展开/折叠按钮
    const expandBtn = this.container.querySelector('#btnExpandAll');
    if (expandBtn) {
      expandBtn.addEventListener('click', () => {
        this.toggleAll();
      });
    }
  }

  async toggleItem(index) {
    const header = this.container.querySelector(`.knowledge-header[data-index="${index}"]`);
    const content = this.container.querySelector(`.knowledge-content[data-index="${index}"]`);

    if (!header || !content) return;

    const isExpanded = this.expandedItems.has(index);

    if (isExpanded) {
      // 折叠
      this.expandedItems.delete(index);
      header.classList.remove('active');
      content.classList.remove('show');
    } else {
      // 展开
      this.expandedItems.add(index);
      header.classList.add('active');
      content.classList.add('show');

      // 如果内容未加载，则加载内容
      if (!this.loadedContents.has(index)) {
        await this.loadContent(index);
      }
    }

    this.updateExpandButton();
  }

  async loadContent(index) {
    const item = this.options.items[index];
    if (!item) return;

    const content = this.container.querySelector(`.knowledge-content[data-index="${index}"] .knowledge-content-inner`);
    const filePath = `${this.options.knowledgePath}${item.file}`;

    try {
      // 检查是否是file://协议，如果是则直接显示链接
      if (window.location.protocol === 'file:') {
        throw new Error('file协议不支持fetch');
      }

      // 获取 Markdown 文件内容
      const response = await fetch(filePath);
      if (!response.ok) throw new Error('加载失败');

      let markdown = await response.text();

      // 截取前2000字符作为预览（或按第一个 ## 分割）
      const previewContent = this.getPreviewContent(markdown);

      // 渲染 Markdown
      const html = this.renderMarkdown(previewContent);

      // 添加查看完整内容链接
      const fullLink = `
        <a href="${filePath}" target="_blank" class="knowledge-full-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6.354 8.04l4.293 4.293a.5.5 0 0 1-.707.707L5.646 9.04a.75.75 0 0 1 0-1.06l4.293-4.293a.5.5 0 1 1 .707.707L6.354 8.04z"/>
          </svg>
          查看完整内容
        </a>
      `;

      content.innerHTML = html + fullLink;
      this.loadedContents.set(index, true);

    } catch (error) {
      // 加载失败时显示友好的提示和直接打开链接
      content.innerHTML = `
        <div class="knowledge-fallback">
          <div class="alert alert-info mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 6px;">
              <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
            </svg>
            <strong>提示：</strong>知识库内容需要通过本地服务器访问才能预览。
          </div>
          <p class="mb-2"><strong>${item.title}</strong></p>
          <p class="text-muted small mb-3">点击下方按钮在新窗口中查看完整知识库文档。</p>
          <a href="${filePath}" target="_blank" class="btn btn-primary btn-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" style="vertical-align: -2px; margin-right: 4px;">
              <path d="M6.354 8.04l4.293 4.293a.5.5 0 0 1-.707.707L5.646 9.04a.75.75 0 0 1 0-1.06l4.293-4.293a.5.5 0 1 1 .707.707L6.354 8.04z"/>
            </svg>
            打开文档
          </a>
        </div>
      `;
      this.loadedContents.set(index, true);
    }
  }

  getPreviewContent(markdown) {
    // 移除 YAML front matter
    markdown = markdown.replace(/^---[\s\S]*?---\n?/, '');

    // 尝试在第二个 ## 处分割，取前面的内容
    const sections = markdown.split(/\n## /);
    if (sections.length > 2) {
      // 取前两个主要章节
      return sections[0] + '\n## ' + sections[1];
    }

    // 否则按字符数限制
    if (markdown.length > 3000) {
      // 尝试在段落边界截断
      const truncated = markdown.substring(0, 3000);
      const lastParagraph = truncated.lastIndexOf('\n\n');
      if (lastParagraph > 1500) {
        return truncated.substring(0, lastParagraph);
      }
      return truncated + '...';
    }

    return markdown;
  }

  renderMarkdown(markdown) {
    // 简单的 Markdown 渲染器
    let html = markdown;

    // 代码块
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 标题
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // 粗体和斜体
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 无序列表
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // 有序列表
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // 表格
    html = this.renderTables(html);

    // 引用
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // 水平线
    html = html.replace(/^---$/gm, '<hr>');

    // 段落
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[1-4]>)/g, '$1');
    html = html.replace(/(<\/h[1-4]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul>)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<table>)/g, '$1');
    html = html.replace(/(<\/table>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<pre>)/g, '$1');
    html = html.replace(/(<\/pre>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<blockquote>)/g, '$1');
    html = html.replace(/(<\/blockquote>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<hr>)/g, '$1');
    html = html.replace(/(<hr>)\s*<\/p>/g, '$1');

    return html;
  }

  renderTables(html) {
    // 简单的表格渲染
    const tableRegex = /\|(.+)\|\n\|[-:\| ]+\|\n((?:\|.+\|\n?)+)/g;

    return html.replace(tableRegex, (match, headerRow, bodyRows) => {
      const headers = headerRow.split('|').filter(h => h.trim()).map(h => `<th>${h.trim()}</th>`).join('');
      const rows = bodyRows.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');

      return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });
  }

  toggleAll() {
    const allExpanded = this.expandedItems.size === this.options.items.length;

    if (allExpanded) {
      // 全部折叠
      this.options.items.forEach((_, index) => {
        if (this.expandedItems.has(index)) {
          this.toggleItem(index);
        }
      });
    } else {
      // 全部展开
      this.options.items.forEach((_, index) => {
        if (!this.expandedItems.has(index)) {
          this.toggleItem(index);
        }
      });
    }
  }

  updateExpandButton() {
    const btn = this.container.querySelector('#btnExpandAll');
    if (!btn) return;

    const allExpanded = this.expandedItems.size === this.options.items.length;

    btn.innerHTML = allExpanded
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M1.854 10.354a.5.5 0 0 1 0-.708l4-4a.5.5 0 1 1 .708.708L3.707 9H14.5a.5.5 0 0 1 0 1H3.707l2.855 2.854a.5.5 0 0 1-.708.708l-4-4z"/>
         </svg> 全部折叠`
      : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
          <path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
         </svg> 全部展开`;
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.KnowledgeBase = KnowledgeBase;
}
