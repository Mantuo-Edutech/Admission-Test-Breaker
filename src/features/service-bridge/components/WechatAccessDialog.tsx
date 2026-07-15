import * as Dialog from "@radix-ui/react-dialog";
import { Download, ShieldCheck, X } from "lucide-react";

export type WechatAccessTarget = "mock-library" | "review-notes";

interface WechatAccessDialogProps {
  open: boolean;
  target: WechatAccessTarget;
  onOpenChange(open: boolean): void;
}

const ACCESS_TARGETS: Readonly<
  Record<WechatAccessTarget, { name: string; requestLabel: string }>
> = {
  "mock-library": {
    name: "完整模考",
    requestLabel: "完整模考",
  },
  "review-notes": {
    name: "完整版复习笔记",
    requestLabel: "复习笔记",
  },
};

export function WechatAccessDialog({
  open,
  target,
  onOpenChange,
}: WechatAccessDialogProps) {
  const accessTarget = ACCESS_TARGETS[target];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content wechat-access-dialog">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">满托资料助手</p>
              <Dialog.Title>添加冰冰，获取{accessTarget.name}</Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="关闭冰冰微信二维码">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="wechat-access-dialog__description">
            使用微信扫码；如果你正在使用手机，可以长按二维码识别或先保存到相册。
          </Dialog.Description>

          <div className="wechat-access-dialog__body">
            <figure className="wechat-access-dialog__qr">
              <img
                src="/brand/bingbing-wechat-qr.jpg"
                alt="冰冰老师微信二维码"
                width="618"
                height="664"
              />
              <figcaption>冰冰 · 满托升学考试小助手</figcaption>
            </figure>

            <div className="wechat-access-dialog__steps">
              <p>添加后这样发送</p>
              <ol>
                <li><span>01</span><strong>发送关键词「TMUA」</strong></li>
                <li><span>02</span><strong>说明需要「{accessTarget.requestLabel}」</strong></li>
                <li><span>03</span><strong>冰冰会确认当前可获取的版本</strong></li>
              </ol>
              <a
                className="button button--secondary wechat-access-dialog__download"
                href="/brand/bingbing-wechat-qr.jpg"
                download="冰冰微信二维码.jpg"
              >
                <Download aria-hidden="true" />
                保存二维码
              </a>
            </div>
          </div>

          <p className="wechat-access-dialog__privacy">
            <ShieldCheck aria-hidden="true" />
            <span>
              本次操作只用于获取资料，不会向冰冰开放你的课程信息、作答记录或训练数据。学习数据授权需要由你另行确认。
            </span>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
