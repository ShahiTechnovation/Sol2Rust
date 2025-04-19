import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
}

export function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 bg-primary bg-opacity-10 rounded-md p-3">
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            <p className="mt-2 text-sm text-gray-500">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
