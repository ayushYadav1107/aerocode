import EmptyState from "@/components/ui/empty-state";
import ProjectTable from "@/features/dashboard/components/project-table";
import {
  getAllPlaygroundForUser,
  deleteProjectById,
  editProjectById,
  duplicateProjectById,
} from "@/features/playground/actions";

const AllPlaygroundsPage = async () => {
  const playgrounds = await getAllPlaygroundForUser();
  const count = playgrounds?.length ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">All playgrounds</h1>
        <p className="text-sm text-muted-foreground">
          {count === 0
            ? "Nothing here yet"
            : `${count} playground${count === 1 ? "" : "s"}, most recently updated first`}
        </p>
      </div>

      {count === 0 ? (
        <EmptyState
          title="No projects found"
          description="Create a new project to get started!"
          imageSrc="/empty-state.svg"
        />
      ) : (
        <ProjectTable
          projects={playgrounds || []}
          onDeleteProject={deleteProjectById}
          onUpdateProject={editProjectById}
          onDuplicateProject={duplicateProjectById}
        />
      )}
    </div>
  );
};

export default AllPlaygroundsPage;
