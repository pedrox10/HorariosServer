import { Entity, Column, PrimaryGeneratedColumn, ObjectIdColumn, ObjectId } from "typeorm"

@Entity()
export class Terminal {
    @ObjectIdColumn() 
    id: ObjectId; 

    @Column()
    nombre: string

    @Column()
    ip: string

    @Column()
    puerto: number
}