import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

const names = [
  "Ahmed", "Sara", "Ali", "Fatima", "Hassan", "Ayesha", "Omar", "Zainab",
  "Bilal", "Mahnoor", "Hamza", "Hira", "Usman", "Alisha", "Faisal", "Maryam"
];

const areas = [
  "F-7", "F-6", "F-10", "G-9", "Blue Area", "Bahria Town", "DHA", "I-8",
  "G-11", "F-8", "Gulberg", "Margalla", "PWD", "Saddar"
];

export default function SignupNotification() {
  const [show, setShow] = useState(false);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const generateNotification = () => {
      const name = names[Math.floor(Math.random() * names.length)];
      const area = areas[Math.floor(Math.random() * areas.length)];
      const time = Math.floor(Math.random() * 5) + 1;
      
      setNotification({
        name,
        area,
        time: time === 1 ? "just now" : `${time} minutes ago`
      });
      setShow(true);

      setTimeout(() => setShow(false), 4000);
    };

    // Show first notification after 3 seconds
    const initialTimeout = setTimeout(generateNotification, 3000);

    // Then show every 8-12 seconds
    const interval = setInterval(() => {
      generateNotification();
    }, Math.random() * 4000 + 8000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && notification && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed bottom-8 left-5 right-5 md:left-auto md:right-8 md:w-80 z-50"
        >
          <div className="bg-white rounded-2xl shadow-2xl border-2 border-green-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">
                {notification.name} from {notification.area}
              </p>
              <p className="text-xs text-gray-600">
                Just joined • {notification.time}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}