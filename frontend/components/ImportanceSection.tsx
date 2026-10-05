import { BookOpen, Compass, Heart, Users } from "lucide-react";
import { honorifics } from "@/components/Honorific";

const features = [
  {
    icon: BookOpen,
    title: "Authentic Sources",
    description:
      "Hadith from the six canonical collections, the Kutub al-Sittah, led by Sahih al-Bukhari and Sahih Muslim.",
  },
  {
    icon: Compass,
    title: "Prophetic Guidance",
    description:
      "Learn the Sunnah of the Prophet ﷺ directly from verified narrations passed down through generations.",
  },
  {
    icon: Heart,
    title: "Daily Application",
    description:
      "Find practical wisdom for worship, manners, family life, and every aspect of your daily routine.",
  },
  {
    icon: Users,
    title: "Accessible Knowledge",
    description:
      "Ask in plain words and get an answer from cited hadith — no need to memorize book numbers or chapter references.",
  },
];

export default function ImportanceSection() {
  return (
    <section className="border-t border-border bg-white/50 px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-3xl font-bold tracking-tight text-primary">
          Why Learn the Sunnah?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-stone-500">
          {honorifics(
            "The Prophet ﷺ said: \u201cI have left among you two things; you will never go astray " +
              "as long as you hold fast to them: the Book of Allah and my Sunnah.\u201d",
          )}
        </p>
        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-xl border border-border bg-white p-6 text-center shadow-sm"
            >
              <feature.icon className="mb-4 h-10 w-10 text-primary" />
              <h3 className="text-lg font-semibold text-stone-800">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">
                {honorifics(feature.description)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
