import {Entity, Column, PrimaryGeneratedColumn} from "typeorm"

@Entity()
export class Terminal {
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    nombre:string
    @Column()
    ip:string
    @Column()
    puerto: number
}