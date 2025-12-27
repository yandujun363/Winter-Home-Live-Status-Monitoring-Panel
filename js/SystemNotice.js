//============================================================================
//https://github.com/sheep-realms/Echo-Live
//============================================================================


export class SystemNotice {
  constructor(sel = "#fh-notice") {
    this.sel = sel; // 通知容器选择器
    this.lastNoticeIndex = 0; // 通知索引计数器
    this.noticeList = {}; // 存储通知数据

    this.init();
  }

  /**
   * 初始化事件绑定
   */
  init() {
    const that = this;
    // 关闭通知按钮事件
    document.addEventListener("click", function (e) {
      if (!e.target.closest(".fh-notice-item-btn-close")) return;
      const $btn = e.target.closest(".fh-notice-item-btn-close");
      const $item = $btn.closest(".fh-notice-item");

      // Shift+点击关闭所有通知
      if (e.shiftKey) {
        document
          .querySelectorAll(`${that.sel} .fh-notice-item`)
          .forEach((el) => {
            el.classList.add("fh-notice-ani-out");
          });
        return;
      }

      // 单个通知关闭
      $item.classList.add("fh-notice-ani-out");
      that.runCallback($item.dataset.index, null);
    });

    // 点击通知内容事件（非关闭按钮）
    document.addEventListener("click", function (e) {
      if (e.target.closest(".fh-notice-item-btn-close")) return;
      const $item = e.target.closest(".fh-notice-item");
      if ($item) that.runCallback($item.dataset.index, "click");
    });

    // 入场动画结束移除类
    document.addEventListener("animationend", function (e) {
      if (e.target.classList.contains("fh-notice-ani-in")) {
        e.target.classList.remove("fh-notice-ani-in");
      }
    });

    // 退场动画结束移除元素
    document.addEventListener("animationend", function (e) {
      if (e.target.classList.contains("fh-notice-ani-out")) {
        e.target.remove();
      }
    });
  }

  /**
   * 发送通知
   * @param {String} message 通知内容
   * @param {String} title 通知标题
   * @param {'alert'|'error'|'info'|'success'|'warn'} type 通知类型
   * @param {Object} data 附加数据（id、waitTime、width、animation等）
   * @param {Function} callback 点击或关闭时的回调
   */
  send(
    message = "",
    title = "",
    type = "info",
    data = {},
    callback = undefined
  ) {
    const index = this.lastNoticeIndex++;
    // 合并默认配置与用户配置
    data = {
      id: undefined,
      waitTime: undefined,
      width: undefined,
      animation: data.animation ?? true, // 是否启用动画
      index: index,
      hasClick: typeof callback === "function",
      ...data,
    };

    // 如果指定了id且已存在，则先关闭旧通知
    if (data.id) {
      const existing = document.querySelector(
        `${this.sel} .fh-notice-item[data-id="${data.id}"]`
      );
      if (existing) this.killById(data.id, true);
    }

    // 创建通知DOM并添加到容器
    const noticeEl = this.createNoticeElement(message, title, type, data);
    const container = document.querySelector(this.sel);
    if (container) container.prepend(noticeEl);

    // 计算自动关闭时间（默认根据内容长度计算）
    let waitTime = Math.max(5000, (message + title).length * 100); // 简化版计算
    if (data.waitTime !== undefined) waitTime = data.waitTime;

    // 自动关闭定时器
    let timer;
    if (waitTime >= 0) {
      timer = setTimeout(() => {
        this.closeByIndex(index);
      }, waitTime);
    }

    // 存储通知数据
    this.addNotice(index, data, callback, timer);
    return index; // 返回通知索引，方便后续操作
  }

  /**
   * 创建通知DOM元素
   */
  createNoticeElement(message, title, type, data) {
    const el = document.createElement("div");
    el.className = `fh-notice-item fh-notice-type-${type} ${
      data.animation ? "fh-notice-ani-in" : ""
    }`;
    el.dataset.index = data.index;
    if (data.id) el.dataset.id = data.id;
    if (data.width) el.style.width = data.width;

    // 构建内部HTML（标题+内容+关闭按钮）
    const titleHtml = title
      ? `<div class="fh-notice-item-title">${title}</div>`
      : "";
    el.innerHTML = `
            ${titleHtml}
            <div class="fh-notice-item-content">${message}</div>
            <button class="fh-notice-item-btn-close">×</button>
        `;
    return el;
  }

  /**
   * 存储通知数据
   */
  addNotice(index, data, callback = () => {}, timer) {
    this.noticeList[index] = {
      id: data.id,
      data: data,
      callback: callback,
      timer: timer,
      unit: new SystemNoticeUnit(this, index),
    };
  }

  /**
   * 关闭通知（通用方法）
   */
  kill(selector, now = false) {
    const elements = document.querySelectorAll(
      `${this.sel} .fh-notice-item${selector}`
    );
    elements.forEach((el) => {
      if (now) {
        el.remove();
      } else {
        el.classList.add("fh-notice-ani-out");
      }
    });
  }

  /**
   * 根据索引关闭通知
   */
  killByIndex(index, now = false) {
    if (index === undefined) return;
    this.kill(`[data-index="${index}"]`, now);
    this.removeByIndex(index);
  }

  /**
   * 根据ID关闭通知
   */
  killById(id, now = false) {
    if (!id) return;
    this.kill(`[data-id="${id}"]`, now);
    // 清除存储的通知数据
    Object.keys(this.noticeList).forEach((key) => {
      if (this.noticeList[key].id === id) {
        this.removeByIndex(key);
      }
    });
  }

  /**
   * 移除通知数据（清除定时器）
   */
  removeByIndex(index) {
    if (this.noticeList[index]) {
      clearTimeout(this.noticeList[index].timer);
      delete this.noticeList[index];
    }
  }

  /**
   * 关闭通知并触发回调
   */
  closeByIndex(index) {
    this.runCallback(index, null);
    this.killByIndex(index);
  }

  /**
   * 触发回调函数
   */
  runCallback(index, value) {
    if (this.noticeList[index]?.callback) {
      this.noticeList[index].callback(value, this.noticeList[index].unit);
    }
  }

  /**
   * 更新通知标题
   */
  setTitle(index, title = "") {
    const el = document.querySelector(
      `${this.sel} .fh-notice-item[data-index="${index}"] .fh-notice-item-title`
    );
    if (el) el.innerHTML = title;
  }

  /**
   * 更新通知内容
   */
  setMessage(index, message = "") {
    const el = document.querySelector(
      `${this.sel} .fh-notice-item[data-index="${index}"] .fh-notice-item-content`
    );
    if (el) el.innerHTML = message;
  }
}

/**
 * 通知单元操作类（用于回调中操作单个通知）
 */
class SystemNoticeUnit {
  constructor(parent, index) {
    this.parent = parent;
    this.index = index;
  }

  // 立即关闭通知
  kill() {
    this.parent.killByIndex(this.index, true);
  }

  // 带动画关闭通知
  close() {
    this.parent.killByIndex(this.index, false);
  }

  // 更新标题
  setTitle(title) {
    this.parent.setTitle(this.index, title);
  }

  // 更新内容
  setMessage(message) {
    this.parent.setMessage(this.index, message);
  }
}
