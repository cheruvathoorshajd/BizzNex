

export interface Task {
    id: number;
    name: string;
    description: string;
    startDate: Date;
    endDate: Date;
    createdAt: Date;
  }
  
  export interface Project {
    id: number;
    name: string;
    tasks: Task[];
  }
  
  /**
   * Represents the state of projects in the application.
   */
  export interface ProjectState {
    /**
     * An array of projects.
     */
    projects: Project[];

    /**
     * The currently selected project, or null if no project is selected.
     */
    selectedProject: Project | null;
  }
  
  export interface UIState {
    language: string;
  }
  
  /**
   * Represents the root state of the application.
   * 
   * @property {ProjectState} projects - The state related to projects.
   * @property {UIState} ui - The state related to the user interface.
   */
  export interface RootState {
    projects: ProjectState;
    ui: UIState;
  }