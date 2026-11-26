"use client";

import { useState } from "react";

export default function ContactForm() {
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  if (status === "sent") {
    return (
      <div className="form-status" role="status">
        感谢你的反馈，我们已经收到。由于本站为静态站点，表单内容需通过下方的邮箱地址发送，我们会尽快回复。
      </div>
    );
  }

  return (
    <form
      className="contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus("sent");
      }}
    >
      <div className="form-field">
        <label htmlFor="cf-name">称呼</label>
        <input id="cf-name" name="name" type="text" required autoComplete="name" />
      </div>
      <div className="form-field">
        <label htmlFor="cf-email">邮箱</label>
        <input
          id="cf-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </div>
      <div className="form-field">
        <label htmlFor="cf-topic">反馈类型</label>
        <select
          id="cf-topic"
          name="topic"
          style={{
            border: "1px solid var(--color-border-strong)",
            borderRadius: "var(--radius)",
            padding: "10px 12px",
            fontFamily: "inherit",
            fontSize: 15,
            background: "#fff",
          }}
        >
          <option>协议内容勘误</option>
          <option>补充新机型</option>
          <option>代码示例问题</option>
          <option>广告合作</option>
          <option>其他</option>
        </select>
      </div>
      <div className="form-field">
        <label htmlFor="cf-message">内容</label>
        <textarea id="cf-message" name="message" required />
      </div>
      <div>
        <button type="submit" className="btn btn--primary">
          提交反馈
        </button>
      </div>
    </form>
  );
}