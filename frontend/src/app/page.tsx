"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowUpIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Estimate = {
  id: number;
  material: string;
  length: number;
  width: number;
  thickness: number;
  edgeFinish: string;
  materialCost: number;
  edgeFinishCost: number;
  laborCost: number;
  taxRate: number;
  discount: number;
  cost: number;
  status: "Pending" | "Sent" | "Approved" | "Declined";
};

type Task = {
  id: number;
  estimateId: number;
  dueDate: string;
  completed: boolean;
};

export default function Home() {
  const [material, setMaterial] = useState("");
  const [length, setLength] = useState(0);
  const [width, setWidth] = useState(0);
  const [thickness, setThickness] = useState(0);
  const [edgeFinish, setEdgeFinish] = useState("");
  const [materialCost, setMaterialCost] = useState(0);
  const [edgeFinishCost, setEdgeFinishCost] = useState(0);
  const [laborCost, setLaborCost] = useState(50);
  const [taxRate, setTaxRate] = useState(10);
  const [discount, setDiscount] = useState(0);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedEstimate, setEditedEstimate] = useState<Estimate | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Fetch estimates from the backend
  const fetchEstimates = async () => {
    try {
      const response = await fetch("http://localhost:8080/estimates");
      if (!response.ok) throw new Error("Failed to fetch estimates");
      const data = await response.json();
      setEstimates(data);
    } catch (error) {
      console.error("Error fetching estimates:", error);
    }
  };

  // Fetch tasks
  const fetchTasks = async () => {
    try {
      const response = await fetch("http://localhost:8080/tasks");
      if (!response.ok) throw new Error("Failed to fetch tasks");
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    }
  };

  useEffect(() => {
    fetchEstimates();
    fetchTasks();
  }, []);

  // Recalculate estimate whenever any input changes
  useEffect(() => {
    calculateEstimate();
  }, [material, length, width, thickness, edgeFinish, materialCost, edgeFinishCost, laborCost, taxRate, discount]);

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const calculateEstimate = () => {
    if (
      length <= 0 ||
      width <= 0 ||
      thickness <= 0 ||
      materialCost < 0 ||
      edgeFinishCost < 0 ||
      laborCost < 0 ||
      taxRate < 0 ||
      discount < 0
    ) {
      setEstimate(null);
      return;
    }

    const volume = length * width * thickness;
    const subtotal = volume * materialCost + laborCost + edgeFinishCost;
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax - discount;
    setEstimate(total);
  };

  const saveEstimate = async () => {
    if (estimate === null) return;

    const newEstimate = {
      material,
      length,
      width,
      thickness,
      edgeFinish,
      materialCost,
      edgeFinishCost,
      laborCost,
      taxRate,
      discount,
      cost: estimate,
      status: editedEstimate ? editedEstimate.status : "Pending",
    };

    try {
      const url = editedEstimate
        ? `http://localhost:8080/estimates/${editedEstimate.id}`
        : "http://localhost:8080/estimates";
      const method = editedEstimate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEstimate),
      });

      if (!response.ok) {
        throw new Error("Failed to save estimate");
      }

      const data = await response.json();
      if (editedEstimate) {
        setEstimates((prev) =>
          prev.map((est) => (est.id === editedEstimate.id ? data : est))
        );
      } else {
        setEstimates((prev) => [...prev, data]);
      }

      // Automatically create a task if status is "Sent"
      if (newEstimate.status === "Sent") {
        await createTask(data.id, new Date().toISOString());
      }

      resetForm();
    } catch (error) {
      console.error("Error saving estimate:", error);
      toast.error("Failed to update estimate");
    }
  };

  const resetForm = () => {
    setMaterial("");
    setLength(0);
    setWidth(0);
    setThickness(0);
    setEdgeFinish("");
    setMaterialCost(0);
    setEdgeFinishCost(0);
    setLaborCost(50);
    setTaxRate(10);
    setDiscount(0);
    setEstimate(null);
    setEditedEstimate(null);
  };

  const deleteEstimate = async (id: number) => {
    try {
      const response = await fetch(`http://localhost:8080/estimates/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete estimate");
      }

      setEstimates((prev) => prev.filter((estimate) => estimate.id !== id));
    } catch (error) {
      console.error("Error deleting estimate:", error);
    }
  };

  const duplicateEstimate = async (id: number) => {
    const estimateToDuplicate = estimates.find((estimate) => estimate.id === id);
    if (estimateToDuplicate) {
      try {
        const response = await fetch("http://localhost:8080/estimates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...estimateToDuplicate, id: undefined }),
        });
        if (!response.ok) {
          throw new Error("Failed to duplicate estimate");
        }
        const data = await response.json();
        setEstimates((prev) => [...prev, data]);
      } catch (error) {
        console.error("Error duplicating estimate:", error);
      }
    }
  };

  const openEditModal = (estimate: Estimate) => {
    setEditedEstimate(estimate);
    setMaterial(estimate.material);
    setLength(estimate.length);
    setWidth(estimate.width);
    setThickness(estimate.thickness);
    setEdgeFinish(estimate.edgeFinish);
    setMaterialCost(estimate.materialCost);
    setEdgeFinishCost(estimate.edgeFinishCost);
    setLaborCost(estimate.laborCost);
    setTaxRate(estimate.taxRate);
    setDiscount(estimate.discount);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditedEstimate(null);
    resetForm();
  };

  const calculateEditEstimate = () => {
    if (
      length <= 0 ||
      width <= 0 ||
      thickness <= 0 ||
      materialCost < 0 ||
      edgeFinishCost < 0 ||
      laborCost < 0 ||
      taxRate < 0 ||
      discount < 0
    ) {
      return 0;
    }

    const volume = length * width * thickness;
    const subtotal = volume * materialCost + laborCost + edgeFinishCost;
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax - discount;
    return total;
  };

  const createTask = async (estimateId: number, dueDate: string) => {
    try {
      const payload = {
        estimateId,
        dueDate,
        completed: false,
      };

      const response = await fetch("http://localhost:8080/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const data = await response.json();
      setTasks((prev) => [...prev, data]);
      toast.success("Task created successfully");
    } catch (error) {
      console.error("Error creating task:", error);
      // toast.error("Failed to create task");
    }
  };

const markTaskCompleted = async (taskId: number) => {
  try {
    const response = await fetch(`http://localhost:8080/tasks/${taskId}/update`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });

    if (!response.ok) {
      const errorData = await response.json(); // Parse the error response
      console.error("Backend error:", errorData); // Log the error details
      throw new Error("Failed to update task");
    }

    // Update the task's status in the frontend state
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, completed: true } : task
      )
    );

    toast.success("Task marked as completed");
  } catch (error) {
    console.error("Error updating task:", error);
    toast.error("Failed to update task");
  }
};

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Estimate Management System</h1>
          <Button onClick={saveEstimate} className="cursor-pointer">
            {editedEstimate ? "Update Estimate" : "Create New Estimate"}
          </Button>
          <Button
            onClick={scrollToTop}
            className={`fixed bottom-6 right-6 p-3 text-white rounded-full cursor-pointer shadow-lg transition-opacity ${
              isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          >
            <ArrowUpIcon className="w-5 h-5" />
          </Button>
        </div>

        {/* Estimates Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Estimates</CardTitle>
            <CardDescription>View and manage all estimates.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Dimensions (cm)</TableHead>
                  <TableHead>Edge Finish</TableHead>
                  <TableHead>Cost ($)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((estimate) => (
                  <TableRow key={estimate.id}>
                    <TableCell>{estimate.material}</TableCell>
                    <TableCell>{estimate.length} x {estimate.width} x {estimate.thickness}</TableCell>
                    <TableCell>{estimate.edgeFinish}</TableCell>
                    <TableCell>${estimate.cost.toFixed(2)}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-sm rounded 
                          ${estimate.status === "Approved" ? "text-green-500 font-semibold" : 
                            estimate.status === "Pending" ? "text-orange-600 font-semibold" :
                            estimate.status === "Declined" ? "text-red-600 font-semibold" :
                            estimate.status === "Sent" ? "text-blue-600 font-semibold" : 
                            "bg-gray-300"}`}
                      >
                        {estimate.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => openEditModal(estimate)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => deleteEstimate(estimate.id)}
                      >
                        Delete
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => duplicateEstimate(estimate.id)}
                      >
                        Duplicate
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Task Management Section */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Follow-Up Tasks</CardTitle>
            <CardDescription>View and manage follow-up tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estimate ID</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell>{task.estimateId}</TableCell>
                    <TableCell>{new Date(task.dueDate).toLocaleString()}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 text-sm rounded ${
                          task.completed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {task.completed ? "Completed" : "Pending"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        onClick={() => markTaskCompleted(task.id)}
                      >
                        Mark as Complete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Create/Edit Estimate Form */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{editedEstimate ? "Edit Estimate" : "Create New Estimate"}</CardTitle>
            <CardDescription>Enter project details to generate a cost estimate.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div>
                <Label htmlFor="material">Material</Label>
                <Input
                  id="material"
                  placeholder="Enter material (e.g., Granite, Marble)"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="materialCost">Material Cost ($/cm³)</Label>
                <Input
                  id="materialCost"
                  type="number"
                  placeholder="Enter material cost per cm³"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="length">Length (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  placeholder="Enter length"
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="width">Width (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  placeholder="Enter width"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="thickness">Thickness (cm)</Label>
                <Input
                  id="thickness"
                  type="number"
                  placeholder="Enter thickness"
                  value={thickness}
                  onChange={(e) => setThickness(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="edgeFinish">Edge Finish</Label>
                <Input
                  id="edgeFinish"
                  placeholder="Enter edge finish (e.g., Polished, Beveled)"
                  value={edgeFinish}
                  onChange={(e) => setEdgeFinish(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edgeFinishCost">Edge Finish Cost ($)</Label>
                <Input
                  id="edgeFinishCost"
                  type="number"
                  placeholder="Enter edge finish cost"
                  value={edgeFinishCost}
                  onChange={(e) => setEdgeFinishCost(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="laborCost">Labor Cost ($)</Label>
                <Input
                  id="laborCost"
                  type="number"
                  placeholder="Enter labor cost"
                  value={laborCost}
                  onChange={(e) => setLaborCost(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  placeholder="Enter tax rate"
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="discount">Discount ($)</Label>
                <Input
                  id="discount"
                  type="number"
                  placeholder="Enter discount"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
              </div>
            </form>

            {/* Display the calculated estimate */}
            {estimate !== null ? (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <p className="text-green-700 font-semibold">
                  Estimated Cost: ${calculateEditEstimate().toFixed(2)}
                </p>
              </div>
            ) : (
              <div className="mt-4 p-4 bg-red-50 rounded-lg">
                <p className="text-red-700 font-semibold">
                  Invalid inputs. Please check your values.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Estimate Modal */}
        <Dialog open={isEditModalOpen} onOpenChange={closeEditModal}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Estimate</DialogTitle>
            </DialogHeader>
            {editedEstimate && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEstimate();
                  closeEditModal();
                }}
                className="space-y-4"
              >
                <div>
                  <Label htmlFor="editMaterial">Material</Label>
                  <Input
                    id="editMaterial"
                    readOnly
                    placeholder="Enter material (e.g., Granite, Marble)"
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="editLength">Length (cm)</Label>
                  <Input
                    id="editLength"
                    type="number"
                    placeholder="Enter length"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="editWidth">Width (cm)</Label>
                  <Input
                    id="editWidth"
                    type="number"
                    placeholder="Enter width"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="editThickness">Thickness (cm)</Label>
                  <Input
                    id="editThickness"
                    type="number"
                    placeholder="Enter thickness"
                    value={thickness}
                    onChange={(e) => setThickness(Number(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="editEdgeFinish">Edge Finish</Label>
                  <Input
                    id="editEdgeFinish"
                    placeholder="Enter edge finish (e.g., Polished, Beveled)"
                    value={edgeFinish}
                    onChange={(e) => setEdgeFinish(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="editStatus">Status</Label>
                  <Select
                    value={editedEstimate.status}
                    onValueChange={(value) =>
                      setEditedEstimate({
                        ...editedEstimate,
                        status: value as "Pending" | "Sent" | "Approved" | "Declined",
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Sent">Sent</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Display the calculated cost in the edit modal */}
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-green-700 font-semibold">
                    Estimated Cost: ${calculateEditEstimate().toFixed(2)}
                  </p>
                </div>
                <Button type="submit" className="w-full">
                  Save Changes
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Toast Container for Notifications */}
        <ToastContainer />
      </div>
    </div>
  );
}