"use server";
import {currentUser} from "@/features/auth/actions";
import {db} from "@/lib/db";
import { Templates } from "@/lib/generated/prisma/wasm";
import { revalidatePath } from "next/cache";


export const createPlayground = async(data:{
    title: string;
    template:Templates;
    description?: string;
    userId : string;
})=>{
    const {template, title, description} = data;
    const user = await currentUser();
    
    try {
        const playground = await db.playground.create({
            data: {
                title,
                description,
                template,
                userId: user?.id,
            }
        });
        return playground;   
    } catch (error) {
        console.error("Error creating playground:", error);
        throw new Error("Failed to create playground");
    }
}

export const getAllPlaygroundForUser = async()=>{
    const user = await currentUser();

    try{
        const playground = await db.playground.findMany({
            where:{
                userId: user?.id
            },
            include:{
                user: true,
                Starkmark:{
                    where:{
                        userId: user?.id
                    },
                    select:{
                        isMarked: true
                    }
                }
            }
        })
        return playground;
    }catch(error){
        console.error("Error fetching playgrounds:", error);
        throw new Error("Failed to fetch playgrounds");
    }
}

export const deleteProjectById = async (id:string)=>{
    try{
        await db.playground.delete({
            where:{id}
        })

        revalidatePath("/dashboard");
    }catch(error){
        console.error(error);
    }
}

export const editProjectById = async (id:string, data:{title:string, description:string})=>{
    try{
        await db.playground.update({
            where:{id},
            data: data
        })
    }catch(error){
        console.error(error);
    }
}

export const duplicateProjectById = async (id:string)=>{
    try{
        const originalPlayground = await db.playground.findUnique({
            where:{id},
        })

        if(!originalPlayground){
            throw new Error("Playground not found");
        }

        const duplicatedPlayground = await db.playground.create({
            data:{
                title:`${originalPlayground.title} (Copy)`,
                description:originalPlayground.description,
                template:originalPlayground.template,
                userId:originalPlayground.userId
            }
        })

        revalidatePath("/dashboard");
    }catch(error){
        console.error(error);
        return null;
    }
}