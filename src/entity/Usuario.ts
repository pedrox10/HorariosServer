    import {Entity, Column, PrimaryGeneratedColumn} from "typeorm"

@Entity()
export class Usuario {
    @PrimaryGeneratedColumn()
    id:number;
    @Column()
    ci: number
    @Column()
    nombre:string
}