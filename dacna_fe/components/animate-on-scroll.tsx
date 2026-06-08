"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

interface Props {
  children: React.ReactNode;
  delay?: number; // (Tùy chọn) Thêm độ trễ
}

/**
 * Component Wrapper (Bọc)
 * Tự động áp dụng hiệu ứng "trượt lên" (slide-up)
 * khi component con được cuộn vào tầm nhìn.
 */
export default function AnimateOnScroll({ children, delay = 0 }: Props) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true, // Chỉ chạy hiệu ứng 1 lần
    margin: "-100px 0px", // Kích hoạt sớm hơn 100px
  });

  // Định nghĩa các trạng thái
  const variants = {
    hidden: { opacity: 0, y: 50 }, // Ẩn (dịch xuống 50px)
    visible: { opacity: 1, y: 0 }, // Hiện (dịch về 0)
  };

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden" // Trạng thái ban đầu
      animate={isInView ? "visible" : "hidden"} // Kích hoạt khi 'isInView'
      transition={{
        duration: 0.5, // Tốc độ trượt (0.5 giây)
        delay: delay, // Độ trễ
      }}
    >
      {children}
    </motion.div>
  );
}
