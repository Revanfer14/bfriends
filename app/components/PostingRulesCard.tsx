"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";

const rules = [
  {
    id: 1,
    text: "Play nice & be cool to everyone.",
  },
  {
    id: 2,
    text: "Keep your posts on-topic for each BHub.",
  },
  {
    id: 3,
    text: "Remember, Binus University rules (PTTAK) apply here and we follow up on breaches.",
  },
];

export function PostingRulesCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-x-2">
          <ListChecks className="w-5 h-5 text-primary" />
          Posting Rules
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        <ul className="space-y-2">
          {rules.map((rule) => (
            <li key={rule.id} className="flex items-start">
              <span className="mr-2 text-primary">✓</span>
              <span>{rule.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
