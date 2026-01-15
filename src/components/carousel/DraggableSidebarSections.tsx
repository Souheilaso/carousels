export type SidebarSectionId = 'images' | 'typography' | 'layers' | 'colorGrade' | 'removeBg';

interface SidebarSection {
  id: SidebarSectionId;
  title: string;
  component: React.ReactNode;
}

interface DraggableSidebarSectionsProps {
  sections: SidebarSection[];
}

export function DraggableSidebarSections({ 
  sections,
}: DraggableSidebarSectionsProps) {
  return (
    <div className="space-y-3">
      {sections.map((section) => {
        return (
          <div key={section.id} className="relative">
            {section.component}
          </div>
        );
      })}
    </div>
  );
}

