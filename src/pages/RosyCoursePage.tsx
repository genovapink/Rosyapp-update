import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import rosyBook from "@/assets/rosy-book.png";

const RosyCoursePage = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 space-y-6 flex flex-col items-center justify-center min-h-[60vh]">
      <button onClick={() => navigate("/")} className="self-start flex items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-center"
      >
        <motion.img
          src={rosyBook}
          alt="Rosy reading book"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 object-contain drop-shadow-md"
        />
        <h1 className="text-3xl font-extrabold text-foreground">COMING SOON!</h1>
        <p className="text-muted-foreground text-sm max-w-xs">
          Trash Lesson sedang dalam pengembangan. Segera kamu bisa belajar mengolah sampahmu dan mendapatkan Rosy Poin! 🌱
        </p>
      </motion.div>
    </div>
  );
};

export default RosyCoursePage;
