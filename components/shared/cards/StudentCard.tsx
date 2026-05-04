import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type StudentCardData = {
  id: string;
  displayName: string;
  yearLevel: string;
  degreeType: string;
  topInterests: string[];
  topSkills: string[];
  availability: "actively_looking" | "open" | "not_available";
};

type StudentCardProps = {
  student: StudentCardData;
};

const availabilityLabelMap: Record<StudentCardData["availability"], string> = {
  actively_looking: "Actively Looking",
  open: "Open to It",
  not_available: "Not Available",
};

const availabilityStyleMap: Record<StudentCardData["availability"], string> = {
  actively_looking:
    "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  open: "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  not_available:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300",
};

export function StudentCard({ student }: StudentCardProps) {
  return (
    <article className="h-full">
      <Link href={`/student/${student.id}`} className="block h-full" aria-label={`View ${student.displayName} profile`}>
        <Card className="h-full min-h-[220px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-lg">{student.displayName}</CardTitle>
              <Badge className={availabilityStyleMap[student.availability]}>
                {availabilityLabelMap[student.availability]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {student.yearLevel} - {student.degreeType}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Top Interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                {student.topInterests.length > 0 ? (
                  student.topInterests.slice(0, 3).map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No interests listed</p>
                )}
              </div>
            </div>
          </CardContent>
          <CardFooter className="mt-auto flex-wrap gap-1.5">
            {student.topSkills.length > 0 ? (
              student.topSkills.slice(0, 2).map((skill) => (
                <Badge key={skill} variant="outline">
                  {skill}
                </Badge>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">No skills listed</p>
            )}
          </CardFooter>
        </Card>
      </Link>
    </article>
  );
}
