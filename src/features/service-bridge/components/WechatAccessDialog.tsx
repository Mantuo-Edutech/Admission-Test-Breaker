import * as Dialog from "@radix-ui/react-dialog";
import { Download, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef } from "react";

export type WechatAccessTarget =
  | "past-paper-library"
  | "published-learning-materials"
  | "review-notes"
  | "deep-review";

interface WechatAccessDialogProps {
  open: boolean;
  target: WechatAccessTarget;
  examName?: "TMUA" | "ESAT" | "TARA" | "LNAT" | "UCAT" | "UK admission test";
  onOpenChange(open: boolean): void;
  onOpened?(): void;
}

const ACCESS_TARGETS: Readonly<
  Record<WechatAccessTarget, { name: string; nameZh: string; requestLabel: string }>
> = {
  "published-learning-materials": {
    name: "published review resources",
    nameZh: "已发布复习资料",
    requestLabel: "six-week plan or worked explanations",
  },
  "review-notes": {
    name: "complete review notes",
    nameZh: "完整版复习笔记",
    requestLabel: "complete review notes",
  },
  "deep-review": {
    name: "worked explanations",
    nameZh: "逐题深度解析",
    requestLabel: "worked-explanation invitation code",
  },
  "past-paper-library": {
    name: "historical paper library",
    nameZh: "历年真题题库",
    requestLabel: "historical paper library",
  },
};

export function WechatAccessDialog({
  open,
  target,
  examName = "TMUA",
  onOpenChange,
  onOpened,
}: WechatAccessDialogProps) {
  const accessTarget = ACCESS_TARGETS[target];
  const reportedOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      reportedOpen.current = false;
      return;
    }
    if (!reportedOpen.current) {
      reportedOpen.current = true;
      onOpened?.();
    }
  }, [onOpened, open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content wechat-access-dialog">
          <div className="dialog-heading">
            <div>
              <p className="eyebrow">MANTOU RESOURCE ASSISTANT</p>
              <Dialog.Title>Add Bingbing to access {accessTarget.name}<small lang="zh-CN">添加冰冰，获取{accessTarget.nameZh}</small></Dialog.Title>
            </div>
            <Dialog.Close className="icon-button" aria-label="Close Bingbing WeChat QR code">
              <X aria-hidden="true" />
            </Dialog.Close>
          </div>

          <Dialog.Description className="wechat-access-dialog__description">
            Scan with WeChat. On mobile, press and hold the QR code or save it to Photos first.
          </Dialog.Description>

          <div className="wechat-access-dialog__body">
            <figure className="wechat-access-dialog__qr">
              <img
                src="/brand/bingbing-wechat-qr.jpg"
                alt="Bingbing's WeChat QR code"
                width="618"
                height="664"
              />
              <figcaption>Bingbing · Mantou admission-test assistant</figcaption>
            </figure>

            <div className="wechat-access-dialog__steps">
              <p>Send these details after adding Bingbing</p>
              <ol>
                <li><span>01</span><strong>Send “{examName}”</strong></li>
                <li><span>02</span><strong>Ask for the {accessTarget.requestLabel}</strong></li>
                <li><span>03</span><strong>Bingbing will confirm the available version</strong></li>
              </ol>
              <a
                className="button button--secondary wechat-access-dialog__download"
                href="/brand/bingbing-wechat-qr.jpg"
                download="bingbing-wechat-qr.jpg"
              >
                <Download aria-hidden="true" />
                Save QR code
              </a>
            </div>
          </div>

          <p className="wechat-access-dialog__privacy">
            <ShieldCheck aria-hidden="true" />
            <span>
              This only requests a resource. Bingbing cannot see your courses, answers or training data. Sharing learning data always requires separate permission from you.
            </span>
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
